import prisma from "../../config/prisma.js";
import CustomError from "../../utils/custom-error.js";
import ApiLogger from "../../utils/api-logger.js";
import OpenMRSLocationRepository from "../openmrs/location/openmrs-location-repository.js";
import OpenMRSLocationService from "../openmrs/location/openmrs-location-service.js";
import GatewayService from "./gateway-service.js";
import pLimit from "p-limit";

const MAX_SCAN = 500;
const MAX_RECOVER = 100;
const RECOVERY_SOURCE = "hrhis-location-recovery";
/** OpenMRS location codes use 5 segments at Council level (TZ.ZONE.REG.DIST.COUNCIL). */
const COUNCIL_CODE_SEGMENTS = 5;

class HrhisLocationRecoveryService {
  /**
   * Derive council-level prefixes (first 5 segments) from any dotted location codes.
   * Failed villages are often missing from Postgres — we still match them via the
   * council prefix shared with sibling locations that are synced.
   */
  static deriveCouncilPrefixesFromCodes(codes) {
    const prefixes = new Set();
    for (const raw of codes || []) {
      const code = String(raw || "").trim();
      if (!code) continue;
      const segments = code.split(".").filter(Boolean);
      if (segments.length >= COUNCIL_CODE_SEGMENTS) {
        prefixes.add(segments.slice(0, COUNCIL_CODE_SEGMENTS).join("."));
      } else if (segments.length > 0) {
        prefixes.add(code);
      }
    }
    return [...prefixes];
  }

  /**
   * Resolve OpenMRS location-code prefixes for the selected council so we can
   * match failed request locationCodes by exact match or descendant prefix.
   */
  static async resolveCouncilPrefixes(region, district, council) {
    if (!region?.trim() || !district?.trim() || !council?.trim()) {
      throw new CustomError("region, district, and council are required.", 400);
    }

    const hierarchyRows = await prisma.openMRSLocationHierarchyView.findMany({
      where: {
        type: { equals: "Council", mode: "insensitive" },
        region: { equals: region.trim(), mode: "insensitive" },
        district: { equals: district.trim(), mode: "insensitive" },
        council: { equals: council.trim(), mode: "insensitive" },
      },
      select: { uuid: true },
    });

    const councilUuids = [...new Set(hierarchyRows.map((r) => r.uuid).filter(Boolean))];
    if (councilUuids.length === 0) {
      throw new CustomError(
        `No council location found for ${region} / ${district} / ${council}. Refresh the location hierarchy view after syncing locations.`,
        404
      );
    }

    const councilLocations = await prisma.openMRSLocation.findMany({
      where: { uuid: { in: councilUuids }, locationCode: { not: null } },
      select: { locationCode: true },
    });

    const underCouncilCodes = await OpenMRSLocationRepository.getLocationCodesByCouncil(
      region,
      district,
      council
    );

    const prefixes = HrhisLocationRecoveryService.deriveCouncilPrefixesFromCodes([
      ...councilLocations.map((l) => l.locationCode),
      ...underCouncilCodes,
    ]);

    if (prefixes.length > 0) {
      return prefixes;
    }

    // Postgres often has the council UUID in the hierarchy view but no Code values
    // under it (council itself may lack a Code attribute; descendant villages may
    // be missing from the hierarchy view even after a full location sync). Fall
    // back to OpenMRS MySQL and walk the live parent/child tree.
    console.warn(
      `⚠️ No location_code values in Postgres for council '${council}'. ` +
        `Deriving prefixes from OpenMRS MySQL under ${councilUuids.length} council uuid(s)…`
    );
    const mysqlCodes = await OpenMRSLocationService.getCodesUnderLocationUuidsFromMysql(councilUuids);
    const mysqlPrefixes = HrhisLocationRecoveryService.deriveCouncilPrefixesFromCodes(mysqlCodes);

    if (mysqlPrefixes.length === 0) {
      throw new CustomError(
        `Council '${council}' has no location Code attributes in Postgres or OpenMRS MySQL ` +
          `under uuid(s): ${councilUuids.join(", ")}. Check OpenMRS location attributes for this council.`,
        404
      );
    }

    console.log(
      `ℹ️ Derived ${mysqlPrefixes.length} council prefix(es) from MySQL for '${council}': ` +
        mysqlPrefixes.join(", ")
    );
    return mysqlPrefixes;
  }

  static locationCodeMatchesPrefixes(locationCode, prefixes) {
    const code = String(locationCode || "").trim();
    if (!code) return false;
    return prefixes.some((prefix) => code === prefix || code.startsWith(`${prefix}.`));
  }

  /**
   * Build a GatewayResponder-shaped success envelope so the Settings chart can
   * count this recovery as a succeeded/retry row.
   */
  static async buildRecoverySuccessEnvelope(req, result) {
    let responseObject;
    try {
      responseObject = await GatewayService.generateHrhisReponseParts(req);
    } catch {
      const header = req?.body?.message?.header || {};
      responseObject = {
        header: {
          sender: header.receiver || "UCS",
          receiver: header.sender || "HRHIS",
          messageType: "CHW_DEPLOYMENT_RESPONSE",
          messageId: `recovery-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      };
    }

    responseObject.body = {
      code: 1,
      status: "success",
      message: result?.message || "Recovered via Settings location recovery.",
    };

    return {
      message: responseObject,
      signature: null,
      recovery: {
        source: RECOVERY_SOURCE,
        created: Boolean(result?.created),
        updated: Boolean(result?.updated),
      },
    };
  }

  /**
   * Write a chart-compatible success log for the retry, then annotate the
   * original failure so scanners and the failed-series skip it.
   */
  static async recordSuccessfulRecovery(originalLog, mockReq, result) {
    const statusCode = result?.created === false ? 200 : 201;
    const envelope = await HrhisLocationRecoveryService.buildRecoverySuccessEnvelope(mockReq, result);

    envelope.recovery.recoveredFromLogId = originalLog.id;
    envelope.recovery.recoveredFromLogUuid = originalLog.uuid;

    const recoveryLog = await ApiLogger.log(
      {
        ...mockReq,
        url: mockReq.url || "/api/v1/gateway/chw/register",
        headers: {
          ...(mockReq.headers || {}),
          "x-ucs-recovery-source": RECOVERY_SOURCE,
        },
      },
      { statusCode, body: envelope }
    );

    if (recoveryLog?.id) {
      await ApiLogger.annotateRecovered(originalLog.id, {
        recoveredByLogId: recoveryLog.id,
        recoveredByLogUuid: recoveryLog.uuid,
      });
    }

    return recoveryLog;
  }

  /**
   * Scan api_logs for failed /chw/register attempts caused by location resolution,
   * scoped to the selected council. Excludes NINs that later registered successfully.
   */
  static async scanLocationFailures({ region, district, council, days = 90 } = {}) {
    const prefixes = await HrhisLocationRecoveryService.resolveCouncilPrefixes(region, district, council);
    const dayCount = Math.min(365, Math.max(1, Number.parseInt(String(days), 10) || 90));

    const allFailed = await prisma.$queryRaw`
      WITH register_logs AS (
        SELECT
          id,
          uuid,
          "createdAt",
          COALESCE(
            request->'body'->'message'->'body'->0->>'locationCode',
            request->'body'->'message'->'body'->>'locationCode'
          ) AS location_code,
          COALESCE(
            request->'body'->'message'->'body'->0->>'NIN',
            request->'body'->'message'->'body'->>'NIN'
          ) AS nin,
          COALESCE(request->'body'->'message'->'body'->0->>'firstName', '') AS first_name,
          COALESCE(request->'body'->'message'->'body'->0->>'middleName', '') AS middle_name,
          COALESCE(request->'body'->'message'->'body'->0->>'lastName', '') AS last_name,
          COALESCE(
            response->'body'->'message'->'body'->>'message',
            CASE
              WHEN jsonb_typeof(response->'body') = 'string' THEN response->>'body'
              ELSE NULL
            END,
            response->'body'->>'body',
            ''
          ) AS err_msg,
          LOWER(COALESCE(response->'body'->'message'->'body'->>'status', '')) AS outcome,
          COALESCE(NULLIF(response->>'status', '')::int, 0) AS http_status,
          COALESCE(response->'body'->'recovery'->>'source', '') AS recovery_source,
          response->>'recoveredAt' AS recovered_at
        FROM api_logs
        WHERE "createdAt" >= CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day')
          AND COALESCE(request->>'url', '') ILIKE '%/chw/register%'
      ),
      succeeded_nins AS (
        -- Only real HRHIS success envelopes (or Settings recovery retries).
        -- Do NOT treat intermediate ApiLogger 200 rows (member/slug dumps) as success —
        -- those lack message.body.status and were incorrectly wiping eligible failures.
        SELECT DISTINCT nin
        FROM register_logs
        WHERE nin IS NOT NULL
          AND nin <> ''
          AND (
            outcome = 'success'
            OR recovery_source = ${RECOVERY_SOURCE}
          )
      )
      SELECT
        f.id,
        f.uuid,
        f."createdAt",
        f.location_code AS "locationCode",
        f.nin AS "NIN",
        f.first_name AS "firstName",
        f.middle_name AS "middleName",
        f.last_name AS "lastName",
        f.err_msg AS "errorMessage"
      FROM register_logs f
      LEFT JOIN succeeded_nins s ON s.nin = f.nin
      WHERE s.nin IS NULL
        AND f.recovered_at IS NULL
        AND COALESCE(f.recovery_source, '') <> ${RECOVERY_SOURCE}
        AND f.location_code IS NOT NULL
        AND f.location_code <> ''
        AND (f.outcome = 'fail' OR f.http_status >= 400)
        AND (
          f.err_msg ILIKE '%Invalid locationCode%'
          OR f.err_msg ILIKE '%no location found for code%'
          OR f.err_msg ILIKE '%no Ward found for code%'
          OR f.err_msg ILIKE '%no Village found for code%'
          OR f.err_msg ILIKE '%no Hamlet found for code%'
          OR f.err_msg ILIKE '%locationType mismatch%'
          OR f.err_msg ILIKE '%less specific than the required%'
          OR f.err_msg ILIKE '%more specific than the required%'
          OR f.err_msg ILIKE '%deeper than the accepted Hamlet%'
        )
      ORDER BY f."createdAt" DESC
      LIMIT ${MAX_SCAN * 5}
    `;

    const candidates = Array.isArray(allFailed) ? allFailed : [];
    const scoped = candidates.filter((row) =>
      HrhisLocationRecoveryService.locationCodeMatchesPrefixes(row.locationCode, prefixes)
    );

    // Dedupe by NIN (keep newest failure)
    const byNin = new Map();
    for (const row of scoped) {
      const nin = String(row.NIN || "").trim();
      const key = nin || `log:${row.id}`;
      if (!byNin.has(key)) byNin.set(key, row);
    }

    const failures = [...byNin.values()].slice(0, MAX_SCAN).map((row) => ({
      id: Number(row.id),
      uuid: row.uuid,
      createdAt: row.createdAt,
      locationCode: row.locationCode,
      NIN: row.NIN,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim() || null,
      errorMessage: row.errorMessage,
    }));

    return {
      region: region.trim(),
      district: district.trim(),
      council: council.trim(),
      councilPrefixes: prefixes,
      days: dayCount,
      count: failures.length,
      failures,
      debug: {
        locationFailuresBeforeCouncilFilter: candidates.length,
        afterCouncilPrefixFilter: scoped.length,
        afterNinDedupe: failures.length,
      },
    };
  }

  /**
   * Re-run stored /chw/register payloads for eligible location failures.
   */
  static async recoverLocationFailures({ region, district, council, logIds, days = 90 } = {}) {
    const scan = await HrhisLocationRecoveryService.scanLocationFailures({
      region,
      district,
      council,
      days,
    });

    let targets = scan.failures;
    if (Array.isArray(logIds) && logIds.length > 0) {
      const idSet = new Set(logIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)));
      targets = targets.filter((f) => idSet.has(f.id));
    }

    targets = targets.slice(0, MAX_RECOVER);

    if (targets.length === 0) {
      return {
        region: scan.region,
        district: scan.district,
        council: scan.council,
        checked: scan.count,
        attempted: 0,
        recovered: 0,
        skipped: 0,
        stillFailed: 0,
        results: [],
      };
    }

    const logs = await prisma.apiLog.findMany({
      where: { id: { in: targets.map((t) => t.id) } },
    });
    const logById = new Map(logs.map((l) => [l.id, l]));

    const limit = pLimit(Number(process.env.P_LIMIT_CONCURRENCY) || 3);
    const results = await Promise.all(
      targets.map((target) =>
        limit(async () => {
          const log = logById.get(target.id);
          if (!log) {
            return {
              id: target.id,
              NIN: target.NIN,
              status: "skipped",
              message: "api_log row not found",
            };
          }

          const request = log.request || {};
          const body = request.body;
          if (!body?.message?.body) {
            return {
              id: target.id,
              NIN: target.NIN,
              status: "skipped",
              message: "Stored request body is missing message.body",
            };
          }

          const mockReq = {
            method: request.method || "POST",
            url: request.url || "/api/v1/gateway/chw/register",
            body,
            query: request.query || {},
            params: request.params || {},
            headers: {},
            signature: null,
            ip: "hrhis-location-recovery",
          };

          try {
            const result = await GatewayService.registerChwFromHrhis(mockReq, {}, () => {});
            const recoveryLog = await HrhisLocationRecoveryService.recordSuccessfulRecovery(
              log,
              mockReq,
              result
            );
            return {
              id: target.id,
              NIN: target.NIN,
              status: "recovered",
              message: result?.message || "Recovered",
              created: Boolean(result?.created),
              updated: Boolean(result?.updated),
              recoveryLogId: recoveryLog?.id ?? null,
            };
          } catch (error) {
            return {
              id: target.id,
              NIN: target.NIN,
              status: "still_failed",
              message: error?.message || String(error),
            };
          }
        })
      )
    );

    const recovered = results.filter((r) => r.status === "recovered").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const stillFailed = results.filter((r) => r.status === "still_failed").length;

    return {
      region: scan.region,
      district: scan.district,
      council: scan.council,
      checked: scan.count,
      attempted: results.length,
      recovered,
      skipped,
      stillFailed,
      results,
    };
  }
}

export default HrhisLocationRecoveryService;
