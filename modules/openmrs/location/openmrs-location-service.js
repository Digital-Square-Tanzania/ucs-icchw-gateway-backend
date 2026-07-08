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
