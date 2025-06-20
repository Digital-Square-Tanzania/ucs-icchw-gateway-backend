import axios from "axios";
import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    try {
      const response = await axios.get(`${process.env.OPENMRS_API_URL}/team/teamrole`, {
        params: {
          v: "custom:(uuid,name,display,identifier,creator:(uuid,display))",
        },
        auth: {
          username: process.env.OPENMRS_API_USERNAME,
          password: process.env.OPENMRS_API_PASSWORD,
        },
      });

      const teamRoles = (response.data.results || []).map((role) => ({
        uuid: role.uuid,
        name: role.name,
        identifier: role.identifier,
        display: role.display,
        creatorUuid: role.creator?.uuid || null,
        creatorName: role.creator?.display || null,
      }));

      console.log("✅ Team roles fetched from OpenMRS:", response.data.results[0]);
      console.log(JSON.stringify(teamRoles, null, 2));

      // Optional: Persist to DB if needed
      // await TeamRoleRepository.upsertTeamRoles(teamRoles);

      return {
        message: "Team roles synchronized successfully.",
        count: teamRoles.length,
        teamRoles,
      };
    } catch (error) {
      console.error("❌ Error fetching team roles:", error.message);
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
