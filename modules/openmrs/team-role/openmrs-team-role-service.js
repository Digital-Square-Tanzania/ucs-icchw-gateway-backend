import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import mysqlClient from "../../../utils/mysql-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    return TeamRoleService.syncTeamRolesFromDb();
  }

  static async syncTeamRolesFromDb() {
    let connection;
    try {
      console.log("🚀 Fast-syncing OpenMRS team roles directly from MySQL...");

      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      const [rows] = await connection.query(`
        SELECT
          tr.team_role_id,
          tr.uuid,
          tr.name,
          tr.identifier,
          tr.date_created,
          (
            SELECT COUNT(*)
            FROM team_member tm
            WHERE tm.team_role_id = tr.team_role_id
              AND COALESCE(tm.voided, 0) = 0
          ) AS member_count
        FROM team_role tr
        WHERE COALESCE(tr.voided, 0) = 0
        ORDER BY tr.team_role_id
      `);

      const teamRoles = (rows || []).map((row) => ({
        uuid: row.uuid,
        name: row.name || "",
        identifier: row.identifier || row.name || row.uuid,
        display: row.name ? `${row.name} - ${row.identifier || row.uuid}` : row.uuid,
        members: Number(row.member_count) || 0,
        creatorName: null,
        creatorUuid: null,
      }));

      await TeamRoleRepository.upsertTeamRoles(teamRoles);
      console.log(`✅ Fast team role sync complete: ${teamRoles.length} role(s).`);

      return {
        message: "Team roles synchronized successfully.",
        count: teamRoles.length,
        teamRoles,
      };
    } catch (error) {
      console.error("❌ Error fast-syncing team roles:", error.message);
      throw new CustomError("Failed to fetch team roles: " + error.message, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /** Legacy REST sync; prefer {@link syncTeamRolesFromDb}. */
  static async syncTeamRolesViaApi() {
    try {
      const response = await openmrsApiClient.get("team/teamrole?v=full");
      const teamRoles = (response.results || []).map((role) => ({
        uuid: role.uuid || null,
        name: role.name || null,
        identifier: role.identifier || null,
        display: role.display || null,
        members: Array.isArray(role.members) ? role.members.length : Number(role.members) || 0,
        creatorUuid: role.auditInfo?.creator?.uuid || null,
        creatorName: role.auditInfo?.creator?.display || null,
      }));
      await TeamRoleRepository.upsertTeamRoles(teamRoles);
      return { message: "Team roles synchronized successfully.", count: teamRoles.length, teamRoles };
    } catch (error) {
      throw new CustomError("Failed to fetch team roles: " + error.message, 500);
    }
  }

  // Retrieves all team roles from the repository
  static async getAllTeamRoles() {
    return await TeamRoleRepository.getAllTeamRoles();
  }

  // Creates a new team role in the repository
  static async getTeamRoleByUUID(uuid) {
    const teamRole = await TeamRoleRepository.getTeamRoleByUUID(uuid);
    if (!teamRole) {
      throw new CustomError("Team role not found.", 404);
    }
    return teamRole;
  }
}

export default TeamRoleService;
