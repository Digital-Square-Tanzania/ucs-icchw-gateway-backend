import axios from "axios";
import dotenv from "dotenv";
import MemberRoleRepository from "./openmrs-member-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import mysqlClient from "../../../utils/mysql-client.js";

dotenv.config();

class MemberRoleService {
  static async syncMemberRolesFromOpenMRS() {
    return MemberRoleService.syncMemberRolesFromDb();
  }

  static async syncMemberRolesFromDb() {
    let connection;
    try {
      console.log("🚀 Fast-syncing OpenMRS user roles directly from MySQL...");

      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      const [rows] = await connection.query(`
        SELECT uuid, role, description
        FROM role
        WHERE COALESCE(retired, 0) = 0
        ORDER BY role_id
      `);

      const roles = (rows || []).map((row) => ({
        uuid: row.uuid,
        name: row.role,
        display: row.role,
        description: row.description || null,
      }));

      await MemberRoleRepository.upsertMemberRoles(roles);
      console.log(`✅ Fast user role sync complete: ${roles.length} role(s).`);
      return { message: "User roles synced successfully.", count: roles.length };
    } catch (error) {
      throw new CustomError("Failed to sync user roles.\n" + error.message, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /** Legacy REST sync; prefer {@link syncMemberRolesFromDb}. */
  static async syncMemberRolesViaApi() {
    try {
      const url = process.env.OPENMRS_API_URL + "role";
      const response = await axios.get(url, {
        auth: {
          username: process.env.OPENMRS_API_USERNAME,
          password: process.env.OPENMRS_API_PASSWORD,
        },
      });
      const roles = response.data.results.map((role) => ({
        uuid: role.uuid,
        name: role.display,
        display: role.display,
        description: role.description || null,
      }));
      await MemberRoleRepository.upsertMemberRoles(roles);
      return { message: "User roles synced successfully." };
    } catch (error) {
      throw new CustomError("Failed to sync user roles.\n" + error.message, 500);
    }
  }

  static async getAllMemberRoles() {
    return await MemberRoleRepository.getAllMemberRoles();
  }

  static async getMemberRoleById(id) {
    return await MemberRoleRepository.getMemberRoleById(id);
  }
}

export default MemberRoleService;
