import axios from "axios";
import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    try {
      const teamRolesResponse = await openmrsApiClient.get("team/teamrole", {
        v: "custom:(uuid,name,display,identifier,creator:(uuid,display))",
      });

      const teamRoles = (teamRolesResponse.results || []).map((role) => ({
        uuid: role.uuid,
        identifier: role.identifier,
        display: role.display,
        name: role.name,
        creator: role.creator?.display || null,
      }));

      console.log("✅ Team roles fetched from OpenMRS:", JSON.stringify(teamRoles, null, 2));

      // Optionally store in DB:
      // await TeamRoleRepository.upsertTeamRoles(teamRoles);

      return {
        message: "Team roles synchronized successfully.",
        teamRoles,
      };
    } catch (error) {
      throw new CustomError("Failed to fetch team roles: " + error.stack, 500);
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
