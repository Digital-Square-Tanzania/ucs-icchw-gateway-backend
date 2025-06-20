import axios from "axios";
import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    try {
      const url = `${process.env.OPENMRS_API_URL}/team/teamrole?v=full`;
      console.log("🌍 Requesting team roles from OpenMRS URL:", url);

      const response = await axios.get(url, {
        auth: {
          username: process.env.OPENMRS_API_USERNAME,
          password: process.env.OPENMRS_API_PASSWORD,
        },
      });

      console.log("📦 OpenMRS full response:", JSON.stringify(response.data, null, 2));

      const teamRoles = (response.data.results || []).map((role) => ({
        uuid: role.uuid || null,
        name: role.name || null,
        identifier: role.identifier || null,
        display: role.display || null,
        creatorUuid: role.auditInfo?.creator?.uuid || null,
        creatorName: role.auditInfo?.creator?.display || null,
      }));

      console.log("✅ Team roles mapped:", JSON.stringify(teamRoles, null, 2));

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

  static async getAllTeamRoles() {
    return await TeamRoleRepository.getAllTeamRoles();
  }

  static async getTeamRoleByUUID(uuid) {
    const teamRole = await TeamRoleRepository.getTeamRoleByUUID(uuid);
    if (!teamRole) {
      throw new CustomError("Team role not found.", 404);
    }
    return teamRole;
  }
}

export default TeamRoleService;
