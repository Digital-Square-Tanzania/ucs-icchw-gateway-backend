import OpenMRSLocationRepository from "./openmrs-location-repository.js";
import OpenMRSApiClient from "../../../utils/openmrs-api-client.js";
import CustomError from "../../../utils/custom-error.js";
import mysqlClient from "../../../utils/mysql-client.js";
import pLimit from "p-limit";

// Geographic location tags to mirror from OpenMRS into the flat openmrs_location
// table. Order matters: later tags win when a location carries more than one
// geographic tag. These are exactly the `type` values the hierarchy view and
// facility/hamlet lookups depend on.
const LOCATION_SYNC_TAGS = ["Country", "Zone", "Region", "District", "Council", "Ward", "Village", "Hamlet", "Facility"];

// Pulls locations for a single OpenMRS tag straight from the OpenMRS MySQL
// database (co-located on the same server), including the parent uuid and the
// HFR Code / Code attributes. This avoids the slow REST v=full pagination.
const LOCATIONS_BY_TAG_SQL = `
  SELECT
    l.location_id AS location_id,
    l.uuid AS uuid,
    l.name AS name,
    l.description AS description,
    l.latitude AS latitude,
    l.longitude AS longitude,
    COALESCE(l.retired, 0) AS retired,
    l.date_created AS date_created,
    parent.uuid AS parent_uuid,
    MAX(CASE WHEN LOWER(TRIM(lat.name)) = 'hfr code' THEN TRIM(la.value_reference) END) AS hfr_code,
    MAX(CASE WHEN LOWER(TRIM(lat.name)) = 'code' THEN TRIM(la.value_reference) END) AS code
  FROM location l
  INNER JOIN location_tag_map ltm ON l.location_id = ltm.location_id
  INNER JOIN location_tag lt ON ltm.location_tag_id = lt.location_tag_id
    AND LOWER(TRIM(lt.name)) = LOWER(TRIM(?))
  LEFT JOIN location parent ON parent.location_id = l.parent_location
  LEFT JOIN location_attribute la ON la.location_id = l.location_id
    AND COALESCE(la.voided, 0) = 0
  LEFT JOIN location_attribute_type lat ON lat.location_attribute_type_id = la.attribute_type_id
  WHERE COALESCE(l.retired, 0) = 0
  GROUP BY l.location_id, l.uuid, l.name, l.description, l.latitude, l.longitude, l.retired, l.date_created, parent.uuid
  ORDER BY l.name
`;

// On-demand lookup by the OpenMRS "Code" attribute (used when Postgres is stale).
// Includes tag names so we can set the local `type` the same way the full sync does.
const LOCATION_BY_CODE_SQL = `
  SELECT
    l.location_id AS location_id,
    l.uuid AS uuid,
    l.name AS name,
    l.description AS description,
    l.latitude AS latitude,
    l.longitude AS longitude,
    COALESCE(l.retired, 0) AS retired,
    l.date_created AS date_created,
    l.parent_location AS parent_location_id,
    parent.uuid AS parent_uuid,
    MAX(CASE WHEN LOWER(TRIM(lat.name)) = 'hfr code' THEN TRIM(la.value_reference) END) AS hfr_code,
    MAX(CASE WHEN LOWER(TRIM(code_lat.name)) = 'code' THEN TRIM(code_la.value_reference) END) AS code,
    GROUP_CONCAT(DISTINCT TRIM(lt.name) ORDER BY lt.name SEPARATOR ',') AS tag_names
  FROM location l
  INNER JOIN location_attribute code_la
    ON code_la.location_id = l.location_id AND COALESCE(code_la.voided, 0) = 0
  INNER JOIN location_attribute_type code_lat
    ON code_lat.location_attribute_type_id = code_la.attribute_type_id
    AND LOWER(TRIM(code_lat.name)) = 'code'
    AND TRIM(code_la.value_reference) = ?
  LEFT JOIN location parent ON parent.location_id = l.parent_location
  LEFT JOIN location_attribute la
    ON la.location_id = l.location_id AND COALESCE(la.voided, 0) = 0
  LEFT JOIN location_attribute_type lat
    ON lat.location_attribute_type_id = la.attribute_type_id
  LEFT JOIN location_tag_map ltm ON ltm.location_id = l.location_id
  LEFT JOIN location_tag lt
    ON lt.location_tag_id = ltm.location_tag_id AND COALESCE(lt.retired, 0) = 0
  WHERE COALESCE(l.retired, 0) = 0
  GROUP BY
    l.location_id, l.uuid, l.name, l.description, l.latitude, l.longitude,
    l.retired, l.date_created, l.parent_location, parent.uuid
  LIMIT 1
`;

const LOCATION_BY_ID_SQL = `
  SELECT
    l.location_id AS location_id,
    l.uuid AS uuid,
    l.name AS name,
    l.description AS description,
    l.latitude AS latitude,
    l.longitude AS longitude,
    COALESCE(l.retired, 0) AS retired,
    l.date_created AS date_created,
    l.parent_location AS parent_location_id,
    parent.uuid AS parent_uuid,
    MAX(CASE WHEN LOWER(TRIM(lat.name)) = 'hfr code' THEN TRIM(la.value_reference) END) AS hfr_code,
    MAX(CASE WHEN LOWER(TRIM(lat.name)) = 'code' THEN TRIM(la.value_reference) END) AS code,
    GROUP_CONCAT(DISTINCT TRIM(lt.name) ORDER BY lt.name SEPARATOR ',') AS tag_names
  FROM location l
  LEFT JOIN location parent ON parent.location_id = l.parent_location
  LEFT JOIN location_attribute la
    ON la.location_id = l.location_id AND COALESCE(la.voided, 0) = 0
  LEFT JOIN location_attribute_type lat
    ON lat.location_attribute_type_id = la.attribute_type_id
  LEFT JOIN location_tag_map ltm ON ltm.location_id = l.location_id
  LEFT JOIN location_tag lt
    ON lt.location_tag_id = ltm.location_tag_id AND COALESCE(lt.retired, 0) = 0
  WHERE l.location_id = ? AND COALESCE(l.retired, 0) = 0
  GROUP BY
    l.location_id, l.uuid, l.name, l.description, l.latitude, l.longitude,
    l.retired, l.date_created, l.parent_location, parent.uuid
  LIMIT 1
`;

// Preference order for local `type` (later wins), matching full sync + municipal aliases.
const TYPE_TAG_PREFERENCE = [
  "Country",
  "Zone",
  "Region",
  "District",
  "Council",
  "Ward",
  "Village",
  "Mtaa",
  "Mitaa",
  "Street",
  "Hamlet",
  "Facility",
];

class OpenMRSLocationService {
  // Get all locations with pagination
  static async getAllLocations(page = 1, limit = 10) {
    return await OpenMRSLocationRepository.getAllLocations(page, limit);
  }

  // Get a location by ID
  static async getLocationByUuid(uuid) {
    return await OpenMRSLocationRepository.getLocationByUuid(uuid);
  }

  // Get locations by tag with pagination
  static async getLocationsByTag(tagName, page, limit) {
    return await OpenMRSLocationRepository.getLocationsByTag(tagName, page, limit);
  }

  // Get all location attribute types
  static async getAllLocationAttributeTypes() {
    return await OpenMRSLocationRepository.getAllLocationAttributeTypes();
  }

  // Get all location tags
  static async getAllLocationTags() {
    return await OpenMRSLocationRepository.getAllLocationTags();
  }

  // Get paginated location hierarchy
  static async getLocationHierarchy(page = 1, limit = 10) {
    const currentPage = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 10;
    const offset = (currentPage - 1) * perPage;

    const [locations, total] = await Promise.all([OpenMRSLocationRepository.getLocationHierarchy(offset, perPage), OpenMRSLocationRepository.countLocationHierarchy()]);

    return {
      locations,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  // Get grouped location hierarchy with separated facilities and villages
  static async getGroupedLocationHierarchy() {
    const flatLocations = await OpenMRSLocationRepository.getFullLocationHierarchy();

    const groupedHierarchy = {};

    flatLocations.forEach((location) => {
      const { country, zone, region, district, council, ward, name, type, uuid } = location;

      // Initialize country
      if (!groupedHierarchy[country]) {
        groupedHierarchy[country] = { name: country, zones: {} };
      }

      // Initialize zone
      if (!groupedHierarchy[country].zones[zone]) {
        groupedHierarchy[country].zones[zone] = { name: zone, regions: {} };
      }

      // Initialize region
      if (!groupedHierarchy[country].zones[zone].regions[region]) {
        groupedHierarchy[country].zones[zone].regions[region] = { name: region, districts: {} };
      }

      // Initialize district
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district] = { name: district, councils: {} };
      }

      // Initialize council
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council] = { name: council, wards: {} };
      }

      // Initialize ward
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward] = {
          name: ward,
          facilities: [], // For Facility types
          villages: [], // For Village types
        };
      }

      // Add to either facilities or villages based on type
      const facilityObj = { name, type, uuid };

      if (type === "Village") {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward].villages.push(facilityObj);
      } else {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward].facilities.push(facilityObj);
      }
    });

    return groupedHierarchy;
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView() {
    return await OpenMRSLocationRepository.refreshLocationHierarchyView();
  }

  /** Pick the most specific geographic tag from a comma-separated MySQL tag list. */
  static pickTypeFromTagNames(tagNames) {
    const tags = String(tagNames || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return null;

    let chosen = null;
    for (const preferred of TYPE_TAG_PREFERENCE) {
      const match = tags.find((t) => t.toLowerCase() === preferred.toLowerCase());
      if (match) chosen = match;
    }
    return chosen || tags[0];
  }

  static mapMysqlLocationRow(row) {
    return {
      locationId: Number(row.location_id),
      name: row.name || "",
      description: row.description || null,
      latitude: row.latitude != null ? String(row.latitude) : null,
      longitude: row.longitude != null ? String(row.longitude) : null,
      retired: Boolean(Number(row.retired)),
      uuid: row.uuid,
      parent: row.parent_uuid || null,
      type: OpenMRSLocationService.pickTypeFromTagNames(row.tag_names),
      hfrCode: row.hfr_code || null,
      locationCode: row.code || null,
      createdAt: row.date_created ? new Date(row.date_created) : new Date(),
      parentLocationId: row.parent_location_id != null ? Number(row.parent_location_id) : null,
    };
  }

  /**
   * When Postgres has no row for a location code, look it up in OpenMRS MySQL
   * (same server), upsert the location and its ancestors into openmrs_location,
   * then return the local row. Returns null if MySQL also has no match.
   */
  static async ensureLocationByCodeFromMysql(locationCode) {
    const code = String(locationCode || "").trim();
    if (!code) return null;

    let connection;
    try {
      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      const [byCodeRows] = await connection.query(LOCATION_BY_CODE_SQL, [code]);
      if (!byCodeRows?.length || !byCodeRows[0].uuid) {
        return null;
      }

      const chain = [];
      let current = OpenMRSLocationService.mapMysqlLocationRow(byCodeRows[0]);
      const seen = new Set();

      while (current?.uuid && !seen.has(current.uuid)) {
        seen.add(current.uuid);
        chain.push(current);

        if (!current.parentLocationId) break;

        const [parentRows] = await connection.query(LOCATION_BY_ID_SQL, [current.parentLocationId]);
        if (!parentRows?.length || !parentRows[0].uuid) break;
        current = OpenMRSLocationService.mapMysqlLocationRow(parentRows[0]);
      }

      // Upsert root → leaf so parent uuids exist before children reference them.
      for (const row of chain.reverse()) {
        const { parentLocationId: _parentId, ...payload } = row;
        await OpenMRSLocationRepository.upsertLocationRow(payload);
      }

      console.log(
        `ℹ️ Self-healed location code '${code}' from OpenMRS MySQL ` +
          `(${chain.length} location(s) upserted).`
      );

      return await OpenMRSLocationRepository.getLocationByCode(code);
    } catch (error) {
      console.error(`❌ MySQL location fallback failed for code '${code}':`, error.message);
      return null;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Collect OpenMRS "Code" attribute values for a location and all descendants.
   * Used by HRHIS recovery / activation filters when Postgres has the council UUID
   * but no location_code values under that council.
   *
   * Walks the tree iteratively (MySQL 5.7 compatible — no WITH RECURSIVE).
   */
  static async getCodesUnderLocationUuidsFromMysql(uuids) {
    const unique = [...new Set((uuids || []).map((u) => String(u || "").trim()).filter(Boolean))];
    if (unique.length === 0) return [];

    let connection;
    try {
      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      const allLocationIds = new Set();

      for (const uuid of unique) {
        const [roots] = await connection.query(
          `SELECT location_id FROM location WHERE uuid = ? AND COALESCE(retired, 0) = 0`,
          [uuid]
        );
        if (!roots?.length) continue;

        let frontier = roots.map((r) => Number(r.location_id)).filter(Number.isFinite);
        for (const id of frontier) allLocationIds.add(id);

        for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
          const placeholders = frontier.map(() => "?").join(",");
          const [children] = await connection.query(
            `SELECT location_id FROM location
             WHERE parent_location IN (${placeholders}) AND COALESCE(retired, 0) = 0`,
            frontier
          );
          const next = [];
          for (const row of children || []) {
            const id = Number(row.location_id);
            if (!Number.isFinite(id) || allLocationIds.has(id)) continue;
            allLocationIds.add(id);
            next.push(id);
          }
          frontier = next;
        }
      }

      if (allLocationIds.size === 0) return [];

      const ids = [...allLocationIds];
      const placeholders = ids.map(() => "?").join(",");
      const [codeRows] = await connection.query(
        `SELECT DISTINCT TRIM(la.value_reference) AS code
         FROM location_attribute la
         INNER JOIN location_attribute_type lat
           ON lat.location_attribute_type_id = la.attribute_type_id
           AND LOWER(TRIM(lat.name)) = 'code'
         WHERE la.location_id IN (${placeholders})
           AND COALESCE(la.voided, 0) = 0
           AND TRIM(la.value_reference) <> ''`,
        ids
      );

      return [...new Set((codeRows || []).map((r) => String(r.code || "").trim()).filter(Boolean))];
    } catch (error) {
      console.error("❌ MySQL getCodesUnderLocationUuidsFromMysql failed:", error.message);
      return [];
    } finally {
      if (connection) connection.release();
    }
  }

  // Sync OpenMRS Locations.
  // Fast path: read directly from the OpenMRS MySQL database (same server).
  // The `pageSize` argument is kept for backward compatibility with existing
  // callers but is unused by the DB sync.
  static async syncLocations(_pageSize) {
    return await OpenMRSLocationService.syncLocationsFromDb();
  }

  // Fast OpenMRS location sync: mirror the OpenMRS MySQL location tree straight
  // into the local flat `openmrs_location` table, then refresh the hierarchy
  // view. Orders of magnitude faster than the REST-based sync.
  static async syncLocationsFromDb() {
    let connection;
    try {
      console.log("🚀 Fast-syncing OpenMRS locations directly from MySQL...");

      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      // Dedupe by uuid across tags so a location tagged with multiple
      // geographic tags produces exactly one row (last tag wins).
      const byUuid = new Map();

      for (const tag of LOCATION_SYNC_TAGS) {
        const [rows] = await connection.query(LOCATIONS_BY_TAG_SQL, [tag]);
        for (const row of rows) {
          if (!row.uuid) continue;
          byUuid.set(row.uuid, {
            locationId: Number(row.location_id),
            name: row.name || "",
            description: row.description || null,
            latitude: row.latitude != null ? String(row.latitude) : null,
            longitude: row.longitude != null ? String(row.longitude) : null,
            retired: Boolean(Number(row.retired)),
            uuid: row.uuid,
            parent: row.parent_uuid || null,
            type: tag,
            hfrCode: row.hfr_code || null,
            locationCode: row.code || null,
            createdAt: row.date_created ? new Date(row.date_created) : new Date(),
          });
        }
        console.log(`   • ${tag}: ${rows.length} location(s)`);
      }

      const locations = Array.from(byUuid.values());
      const count = await OpenMRSLocationRepository.replaceAllLocations(locations);

      // Refresh the hierarchy view so grouped-location lookups reflect the new
      // data. Non-fatal: a view refresh failure shouldn't fail the whole sync.
      try {
        await OpenMRSLocationRepository.refreshLocationHierarchyView();
        console.log("♻️  Refreshed openmrs_location_hierarchy_view.");
      } catch (viewError) {
        console.warn("⚠️  Location hierarchy view refresh failed:", viewError.message);
      }

      console.log(`✅ Fast location sync complete: ${count} location(s) synced.`);
      return { synced: count };
    } catch (error) {
      console.error("❌ Error fast-syncing OpenMRS locations:", error.message);
      throw new CustomError("OpenMRS Location Sync Error: " + error.message);
    } finally {
      if (connection) connection.release();
    }
  }

  // Legacy REST-based sync. Kept as a fallback; prefer syncLocationsFromDb().
  static async syncLocationsViaApi(pageSize) {
    try {
      console.log("🔄 Syncing OpenMRS Locations in batches...");

      let fetchedRecords = 0;
      let totalFetched = 0;
      const concurrency = 10;
      const limit = pLimit(concurrency);

      while (true) {
        console.log(`📥 Fetching records starting at index ${fetchedRecords}...`);

        const response = await OpenMRSApiClient.get("location", {
          v: "custom:(locationId,name,description,latitude,longitude,retired,uuid,parentLocation:(name,uuid),tags:(name,uuid),attributes:(display),dateCreated)",
          startIndex: fetchedRecords,
          limit: pageSize,
        });

        const locations = response.results || [];
        const fetchedCount = locations.length;

        if (fetchedCount === 0) {
          console.log(`✅ No more locations to fetch. Total locations synced: ${totalFetched}`);
          break;
        }

        const transformedLocations = locations.map((location) => {
          let hfrCode = null;
          let locationCode = null;

          if (Array.isArray(location.attributes)) {
            for (const attr of location.attributes) {
              const display = attr.display || "";
              if (display.startsWith("HFR Code:")) {
                hfrCode = display.split("HFR Code:")[1].trim();
              } else if (display.startsWith("Code:")) {
                locationCode = display.split("Code:")[1].trim();
              }
            }
          }

          return {
            locationId: location.locationId,
            name: location.name,
            description: location.description,
            latitude: location.latitude,
            longitude: location.longitude,
            retired: location.retired,
            uuid: location.uuid || null,
            parentLocation: location.parentLocation || null,
            tags: location.tags || [],
            hfrCode,
            locationCode,
            dateCreated: location.dateCreated,
          };
        });

        // Upsert locations in batch
        await OpenMRSLocationRepository.upsertLocations(transformedLocations);

        // Save logs concurrently
        const logTasks = transformedLocations.map((loc) =>
          limit(() =>
            OpenMRSLocationRepository.saveSyncLog("openmrs_location", loc.uuid, "SYNC", "SUCCESS", {
              name: loc.name,
              retired: loc.retired,
              uuid: loc.uuid,
              parentUuid: loc.parentLocation?.uuid || null,
              type: null, // Add if needed
              hfrCode: loc.hfrCode,
              locationCode: loc.locationCode,
            })
          )
        );

        // Run concurrently with safe option to avoid crashing on single log failure
        await Promise.allSettled(logTasks);
        // If you prefer to crash on error, replace above with: await Promise.all(logTasks);

        totalFetched += fetchedCount;
        fetchedRecords += fetchedCount;

        console.log(`✅ Fetched ${fetchedCount} records, Total fetched: ${totalFetched}`);
      }

      console.log("✅ OpenMRS Location Sync Completed.");
    } catch (error) {
      console.error("❌ Error syncing OpenMRS locations:", error.message);
      throw new CustomError("OpenMRS Location Sync Error: " + error.message);
    }
  }

  static async syncLocationTags() {
    try {
      console.log("🔄 Syncing OpenMRS Location Tags...");

      // Fetch all location tags from OpenMRS
      const response = await OpenMRSApiClient.get("locationtag", { v: "full" });
      const tags = response.results || [];

      // Store the tags in the database
      await OpenMRSLocationRepository.upsertLocationTags(tags);

      console.log("✅ OpenMRS Location Tags Sync Completed.");
    } catch (error) {
      throw new CustomError("❌ OpenMRS Location Tags Sync Error: " + error.message);
    }
  }

  static async syncLocationAttributeTypes() {
    try {
      console.log("🔄 Syncing OpenMRS Location Attribute Types...");

      // Fetch all location attribute types from OpenMRS
      const response = await OpenMRSApiClient.get("locationattributetype", { v: "full" });
      const attributeTypes = response.results || [];

      // Store the attribute types in the database
      await OpenMRSLocationRepository.upsertLocationAttributeTypes(attributeTypes);

      console.log("✅ OpenMRS Location Attribute Types Sync Completed.");
    } catch (error) {
      throw new CustomError("❌ OpenMRS Location Attribute Types Sync Error: " + error.message);
    }
  }

  // Search facilities by name
  static async searchFacilities(name) {
    try {
      console.log(`🔍 Searching for facilities with name: ${name}`);
      const results = await OpenMRSLocationRepository.searchFacilities(name);
      return results;
    } catch (error) {
      throw new CustomError("❌ Facility Search Error: " + error.message);
    }
  }

  // Search hamlets by name
  static async searchHamlets(name) {
    try {
      console.log(`🔍 Searching for hamlets with name: ${name}`);
      const results = await OpenMRSLocationRepository.searchHamlets(name);
      return results;
    } catch (error) {
      throw new CustomError("❌ Hamlet Search Error: " + error.message);
    }
  }

  // Search facility hamlets by facility parent
  static async searchFacilityHamlets(facilityParent) {
    try {
      console.log(`🔍 Searching for hamlets with facility parent: ${facilityParent}`);
      const results = await OpenMRSLocationRepository.searchFacilityHamlets(facilityParent);
      return results;
    } catch (error) {
      throw new CustomError("❌ Facility Hamlet Search Error: " + error.message);
    }
  }
}

export default OpenMRSLocationService;
