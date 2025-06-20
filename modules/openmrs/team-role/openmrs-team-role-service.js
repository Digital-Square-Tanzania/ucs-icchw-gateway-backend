import axios from "axios";
import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    try {
      const url = `${process.env.OPENMRS_API_URL}/team/teamrole?v=full`;
      console.log("🌍 Requesting team roles from OpenMRS URL:", url);

      const response = await openmrsApiClient.get(url);

      const teamRoles = (response.results || []).map((role) => ({
        uuid: role.uuid || null,
        name: role.name || null,
        identifier: role.identifier || null,
        display: role.display || null,
        creatorUuid: role.auditInfo?.creator?.uuid || null,
        creatorName: role.auditInfo?.creator?.display || null,
      }));

      console.log("✅ Team roles mapped successfully.");

      // Save or update team roles in the repository
      await TeamRoleRepository.upsertTeamRoles(teamRoles);

      return {
        message: "Team roles synchronized successfully.",
        count: teamRoles.length,
        teamRoles,
      };
    } catch (error) {
      console.error("❌ Error syncing team roles:", error.response?.data || error.message);
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
