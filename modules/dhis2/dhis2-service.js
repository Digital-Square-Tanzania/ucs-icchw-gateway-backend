import DHIS2ApiClient from "./dhis2-api-client.js";
import DHIS2Repository from "./dhis2-repository.js";

class DHIS2Service {
  /**
   * Sync DHIS2 Org Units in Batches
   */
  static async syncOrgUnits(pageSize = 500) {
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
        });

        const orgUnits = response.organisationUnits || [];
        totalPages = Math.ceil(response.pager.total / pageSize); // Get total pages dynamically

        // Store the batch in the database
        await DHIS2Repository.upsertOrgUnits(orgUnits);

        // Log each sync operation
        for (const unit of orgUnits) {
          await DHIS2Repository.saveSyncLog("orgUnit", unit.id, "SYNC", "SUCCESS", {
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
   * Fetch all stored Org Units
   */
  static async getOrgUnits() {
    return await DHIS2Repository.getOrgUnits();
  }
}

export default DHIS2Service;
