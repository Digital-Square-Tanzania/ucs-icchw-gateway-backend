import DHIS2ApiClient from "../dhis2-api-client.js";
import DHIS2UserRepository from "./dhis2-user-repository.js";
import CustomError from "../../../utils/custom-error.js";

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

  static async getUsers({ page, pageSize }) {
    try {
      const pageNum = Number(page) || 1;
      const pageSizeNum = Number(pageSize) || 10;

      const offset = (pageNum - 1) * pageSizeNum;
      const users = await DHIS2UserRepository.getUsers(offset, pageSizeNum);
      return users;
    } catch (error) {
      console.error("❌ Failed to get DHIS2 users:", error.message);
      throw new CustomError("Failed to get users from DHIS2. " + error.message, 500);
    }
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
        email: userData.email || null,
        userRoles: userData.roles.map((roleId) => ({ id: roleId })),
        organisationUnits: userData.orgUnits.map((orgUnitId) => ({ id: orgUnitId })),
      };

      // Send request to DHIS2 API
      const response = await DHIS2ApiClient.post("/users", payload);
      if (!response.response || !response.response.uid) {
        throw new Error("DHIS2 did not return a user UID.");
      }

      // Format user data for local database
      const newUser = {
        uuid: response.response.uid,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        // displayName: `${userData.firstName} ${userData.lastName}`,
        email: userData.email || null,
        phoneNumber: userData.phoneNumber || null,
        roleUuids: userData.roles,
        orgUnitUuids: userData.orgUnits,
      };

      // Save to local DB
      await DHIS2UserRepository.createUser(newUser);

      console.log(`✅ User ${userData.username} successfully created in DHIS2.`);
      return response;
    } catch (error) {
      console.error("❌ Failed to create DHIS2 user:", error.message);
      throw new Error("Failed to create user in DHIS2. " + error.message);
    }
  }

  static deleteUser(userId) {
    try {
      console.log(`🔄 Deleting user with ID: ${userId}...`);
      return DHIS2ApiClient.delete(`/users/${userId}`);
    } catch (error) {
      console.error("❌ Failed to delete DHIS2 user:", error.message);
      throw new Error("Failed to delete user in DHIS2. " + error.message);
    }
  }
}

export default DHIS2UserService;
