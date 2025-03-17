import DHIS2ApiClient from "../dhis2-api-client.js";
import DHIS2OrgUnitRepository from "./dhis2-org-unit-repository.js";

class DHIS2OrgUnitService {
  /**
   * Sync DHIS2 Org Units in Batches
   */
  static async syncOrgUnits(pageSize) {
    try {
      console.log("🔄 Syncing DHIS2 Org Units in batches...");
      let currentPage = 1;
      let totalPages = 1;

      do {
        console.log(`📥 Fetching page ${currentPage} of ${totalPages}...`);

        // Fetch the current batch
        const response = await DHIS2ApiClient.get("/organisationUnits", {
          fields: "id,displayName,level,geometry,parent[id,displayName,level]",
          page: currentPage,
          pageSize: pageSize,
          limit: pageSize,
        });

        const orgUnits = response.organisationUnits || [];
        totalPages = Math.ceil(response.pager.total / pageSize); // Get total pages dynamically

        // Store the batch in the database
        await DHIS2OrgUnitRepository.upsertOrgUnits(orgUnits);

        // Log each sync operation
        for (const unit of orgUnits) {
          await DHIS2OrgUnitRepository.saveSyncLog("dhis2_orgUnit", unit.id, "SYNC", "SUCCESS", {
            name: unit.displayName,
            level: unit.level,
            parentUuid: unit.parent?.id || null,
            parentName: unit.parent?.displayName || null,
          });
        }

        console.log(`✅ Page ${currentPage} processed.`);
        currentPage++;
      } while (currentPage <= totalPages);

      console.log("✅ DHIS2 Org Unit Sync Completed.");
    } catch (error) {
      console.error("❌ DHIS2 Org Unit Sync Error:", error.message);
      throw new Error("Failed to sync DHIS2 Org Units.");
    }
  }

  /**
   * Get all Org Units with filtering, sorting, and pagination
   */
  static async getOrgUnits({ name, level, parentUuid, limit = 50, page = 1, sortBy = "name", order = "asc" }) {
    return await DHIS2OrgUnitRepository.getOrgUnits({ name, level, parentUuid, limit, page, sortBy, order });
  }

  /**
   * Fetch Level 4 Org Units grouped by Parent Name (Level 3)
   */
  static async getGroupedOrgUnits() {
    try {
      console.log("🔄 Fetching Level 4 Org Units grouped by Parent...");
      const groupedUnits = await DHIS2OrgUnitRepository.getGroupedOrgUnits();
      console.log("✅ Successfully fetched grouped org units.");
      return groupedUnits;
    } catch (error) {
      console.error("❌ Failed to fetch grouped org units:", error.message);
      throw new Error("Failed to fetch grouped org units. " + error.message);
    }
  }
}

export default DHIS2OrgUnitService;
