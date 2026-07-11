import OpenMRSLocationRepository from "../../openmrs/location/openmrs-location-repository.js";
import ApiError from "../../../utils/api-error.js";

/**
 * Number of dot-separated segments an OpenMRS location code has at each level.
 *
 * Codes are strictly hierarchical, e.g. TZ.NT.KL.MS.4.5.1.1:
 *   TZ -> Country  (1)   4 -> Council       (5)
 *   NT -> Zone     (2)   5 -> Ward          (6)
 *   KL -> Region   (3)   1 -> Village/Mtaa/Street (7)
 *   MS -> District (4)   1 -> Hamlet        (8)
 *
 * Because the hierarchy is encoded positionally, dropping the trailing
 * segment(s) of a deeper code yields the code of an ancestor level (a Hamlet
 * code minus its last segment is exactly its parent Village code).
 */
const LEVEL_SEGMENTS = {
  Country: 1,
  Zone: 2,
  Region: 3,
  District: 4,
  Council: 5,
  Ward: 6,
  Village: 7,
  Hamlet: 8,
};

// Canonical operational levels (ENV + resolution targets).
const ALLOWED_OPERATIONAL_LEVELS = ["Ward", "Village", "Hamlet"];
const DEFAULT_OPERATIONAL_LEVEL = "Village";

/**
 * Map an HRHIS locationType to the canonical hierarchy level.
 * Mtaa / Street are English/Swahili labels for the Village-level unit in
 * municipal (MC/CC) councils; rural DCs use Village.
 */
const DECLARED_TYPE_TO_LEVEL = {
  Ward: "Ward",
  Village: "Village",
  Hamlet: "Hamlet",
  Mtaa: "Village",
  Street: "Village",
  Mitaa: "Village",
};

// OpenMRS tags accepted when matching a declared/canonical Village-level pin.
const TYPE_ALIASES = {
  Ward: ["Ward"],
  Village: ["Village", "Mtaa", "Mitaa", "Street"],
  Hamlet: ["Hamlet"],
};

/**
 * Resolves the location that a CHW team membership should be attached to from the
 * location code sent by HRHIS.
 *
 * When `locationType` is provided (Hamlet | Village | Ward | Mtaa | Street), the
 * exact locationCode is looked up and must carry a matching OpenMRS tag; a
 * mismatch is rejected. When omitted, resolution falls back to the ENV-driven
 * policy:
 *
 *  - ICCHW_LOWEST_OPERATIONAL_HIERARCHY: Hamlet | Village | Ward (default Village)
 *  - ACCEPT_HAMLET_CODES_FROM_HRHIS: true | false (default false)
 */
class LocationResolver {
  static getOperationalLevel() {
    const raw = (process.env.ICCHW_LOWEST_OPERATIONAL_HIERARCHY || "").trim();
    if (!raw) return DEFAULT_OPERATIONAL_LEVEL;

    const normalized = LocationResolver.normalizeLevel(raw);
    if (!ALLOWED_OPERATIONAL_LEVELS.includes(normalized)) {
      console.warn(
        `⚠️ Invalid ICCHW_LOWEST_OPERATIONAL_HIERARCHY="${raw}". Expected one of ` +
          `${ALLOWED_OPERATIONAL_LEVELS.join(", ")}. Falling back to ${DEFAULT_OPERATIONAL_LEVEL}.`
      );
      return DEFAULT_OPERATIONAL_LEVEL;
    }
    return normalized;
  }

  static acceptsDeeperCodes() {
    return String(process.env.ACCEPT_HAMLET_CODES_FROM_HRHIS || "").trim().toLowerCase() === "true";
  }

  /** Normalize a level/type string to Title case (e.g. "village" -> "Village"). */
  static normalizeLevel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  /** Trim/normalize a dotted code into clean segments joined by single dots. */
  static normalizeCode(locationCode) {
    return String(locationCode || "")
      .trim()
      .split(".")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .join(".");
  }

  static typesMatchDeclared(actualType, canonicalLevel) {
    const aliases = TYPE_ALIASES[canonicalLevel] || [canonicalLevel];
    const actual = String(actualType || "").trim().toLowerCase();
    return aliases.some((alias) => alias.toLowerCase() === actual);
  }

  /**
   * @param {string} locationCode e.g. "TZ.CL.SD.MN.4.20.3" (Village) or "...3.3" (Hamlet)
   * @param {string|null|undefined} locationType optional type from HRHIS
   * @returns {Promise<Object>} the resolved OpenMRS location row
   * @throws {ApiError} when the code cannot or should not be resolved; the caller
   *   must abort and reverse any other transactions.
   */
  static async resolve(locationCode, locationType) {
    const declared = LocationResolver.normalizeLevel(locationType);
    if (declared) {
      return LocationResolver.resolveByDeclaredType(locationCode, declared);
    }
    return LocationResolver.resolveByEnvPolicy(locationCode);
  }

  /**
   * Explicit locationType path: look up the exact code and require its OpenMRS
   * tag to match the declared type. Mtaa/Street are treated as Village-level.
   */
  static async resolveByDeclaredType(locationCode, declaredType) {
    const canonicalLevel = DECLARED_TYPE_TO_LEVEL[declaredType];
    if (!canonicalLevel) {
      throw new ApiError(
        `Invalid locationType '${declaredType}'. Expected one of Hamlet, Village, Ward, Mtaa, or Street.`,
        422,
        4
      );
    }

    const normalized = LocationResolver.normalizeCode(locationCode);
    if (!normalized) {
      throw new ApiError("Missing or empty locationCode.", 422, 4);
    }

    const location = await OpenMRSLocationRepository.getLocationByCode(normalized);
    if (!location || !location.uuid) {
      throw new ApiError(
        `Invalid locationCode: no location found for code '${normalized}'.`,
        404,
        4
      );
    }

    if (!LocationResolver.typesMatchDeclared(location.type, canonicalLevel)) {
      throw new ApiError(
        `locationType mismatch: locationCode '${normalized}' is tagged as '${location.type || "unknown"}' ` +
          `but locationType was '${declaredType}' (expected a ${canonicalLevel}-level tag` +
          `${canonicalLevel === "Village" ? ": Village, Mtaa, or Street" : ""}).`,
        422,
        4
      );
    }

    return location;
  }

  /**
   * ENV-driven path used when locationType is omitted.
   */
  static async resolveByEnvPolicy(locationCode) {
    const operationalLevel = LocationResolver.getOperationalLevel();
    const targetSegments = LEVEL_SEGMENTS[operationalLevel];

    const normalized = LocationResolver.normalizeCode(locationCode);
    if (!normalized) {
      throw new ApiError("Missing or empty locationCode.", 422, 4);
    }

    const incomingCount = normalized.split(".").length;

    // 1) Code already at the operational level: resolve it directly.
    if (incomingCount === targetSegments) {
      return LocationResolver.findByCodeOrThrow(normalized, operationalLevel, normalized);
    }

    // 2) Deeper (more specific) code, e.g. a Hamlet code while operating at Village.
    if (incomingCount > targetSegments) {
      if (operationalLevel === "Hamlet") {
        throw new ApiError(
          `locationCode '${normalized}' is deeper than the accepted Hamlet level.`,
          422,
          4
        );
      }

      if (!LocationResolver.acceptsDeeperCodes()) {
        throw new ApiError(
          `locationCode '${normalized}' is more specific than the required ${operationalLevel} level. ` +
            `Send a ${operationalLevel}-level code, or set ACCEPT_HAMLET_CODES_FROM_HRHIS=true to accept and derive it.`,
          422,
          4
        );
      }

      const derived = normalized.split(".").slice(0, targetSegments).join(".");
      console.log(`ℹ️ Deriving ${operationalLevel} code '${derived}' from deeper locationCode '${normalized}'.`);
      return LocationResolver.findByCodeOrThrow(derived, operationalLevel, normalized);
    }

    // 3) Shallower (less specific) code: cannot pin a CHW below the provided level.
    throw new ApiError(
      `locationCode '${normalized}' is less specific than the required ${operationalLevel} level.`,
      422,
      4
    );
  }

  static async findByCodeOrThrow(code, operationalLevel, originalCode) {
    const location = await OpenMRSLocationRepository.getLocationByCode(code);
    if (!location || !location.uuid) {
      const derivedNote = code === originalCode ? "" : ` (derived from '${originalCode}')`;
      throw new ApiError(
        `Invalid locationCode: no ${operationalLevel} found for code '${code}'${derivedNote}.`,
        404,
        4
      );
    }
    return location;
  }
}

export default LocationResolver;
