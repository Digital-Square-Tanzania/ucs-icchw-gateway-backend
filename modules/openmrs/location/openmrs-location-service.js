import OpenMRSLocationRepository from "./openmrs-location-repository.js";
import OpenMRSApiClient from "../../../utils/openmrs-api-client.js";
import CustomError from "../../../utils/custom-error.js";
import pLimit from "p-limit";

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

  // Sync OpenMRS Locations in Batches
  static async syncLocations(pageSize) {
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
