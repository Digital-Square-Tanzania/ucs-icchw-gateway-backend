import DHIS2ApiClient from "../dhis2-api-client.js";
import DHIS2UserRepository from "./dhis2-user-repository.js";

class DHIS2UserService {
  static async syncUsers() {
    try {
      console.log("🔄 Syncing DHIS2 Users...");
      const users = await DHIS2ApiClient.get("/users?fields=id,username,displayName,firstName,surname,email,organisationUnits,userRoles", { paging: false });
      await DHIS2UserRepository.upsertUsers(users.users);
      console.log("✅ DHIS2 Users Sync Completed.");
    } catch (error) {
      console.error("❌ DHIS2 User Sync Error:", error.message);
      throw new Error("Failed to sync DHIS2 Users.");
    }
  }

  static async getUsers() {
    return await DHIS2UserRepository.getUsers();
  }

  static async createUser(userData) {
    try {
      console.log("🔄 Creating new DHIS2 user...");

      // Format payload for DHIS2 API
      const payload = {
        userCredentials: {
          username: userData.username,
          password: userData.password,
        },
        firstName: userData.firstName,
        surname: userData.lastName,
        email: userData.email,
        userRoles: userData.roles.map((roleId) => ({ id: roleId })),
        organisationUnits: userData.orgUnits.map((orgUnitId) => ({ id: orgUnitId })),
      };

      // Send to DHIS2 API
      const response = await DHIS2ApiClient.post("/users", payload);

      // Save to local DB
      await DHIS2UserRepository.createUser({
        uuid: response.response.uid,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        roles: userData.roles,
      });

      console.log("✅ User successfully created in DHIS2.");
      return response;
    } catch (error) {
      console.error("❌ Failed to create DHIS2 user:", error.stack);
      throw new Error("Failed to create user in DHIS2.");
    }
  }
}

export default DHIS2UserService;
