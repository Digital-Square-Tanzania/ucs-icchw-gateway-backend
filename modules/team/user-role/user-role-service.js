import axios from "axios";
import dotenv from "dotenv";
import UserRoleRepository from "./user-role-repository.js";
import CustomError from "../../../utils/custom-error.js";

dotenv.config();

class UserRoleService {
  static async syncUserRolesFromOpenMRS() {
    try {
      const url = process.env.OPENMRS_API_URL + "role";
      const username = process.env.OPENMRS_API_USERNAME;
      const password = process.env.OPENMRS_API_PASSWORD;
      console.log(`🔄 Fetching user roles from: ${url}`);
      const response = await axios.get(url, {
        auth: {
          username: username,
          password: password,
        },
      });

      const roles = response.data.results.map((role) => ({
        uuid: role.uuid,
        name: role.display,
        display: role.display,
        description: role.description || null,
      }));

      await UserRoleRepository.upsertUserRoles(roles);
      return { message: "User roles synced successfully." };
    } catch (error) {
      throw new CustomError("Failed to sync user roles.\n" + error.message, 500);
    }
  }

  static async getAllUserRoles() {
    return await UserRoleRepository.getAllUserRoles();
  }

  static async getUserRoleById(id) {
    return await UserRoleRepository.getUserRoleById(id);
  }
}

export default UserRoleService;
