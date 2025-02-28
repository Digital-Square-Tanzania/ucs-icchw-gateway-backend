import DHIS2ApiClient from "../dhis2-api-client.js";
import DHIS2RoleRepository from "./dhis2-role-repository.js";

class DHIS2RoleService {
  static async syncRoles() {
    try {
      console.log("🔄 Syncing DHIS2 User Roles...");
      const roles = await DHIS2ApiClient.get("/userRoles", { paging: false });
      await DHIS2RoleRepository.upsertRoles(roles.userRoles);
      console.log("✅ DHIS2 Roles Sync Completed.");
    } catch (error) {
      console.error("❌ DHIS2 Role Sync Error:", error.message);
      throw new Error(error.message);
    }
  }

  static async getRoles() {
    return await DHIS2RoleRepository.getRoles();
  }
}

export default DHIS2RoleService;
