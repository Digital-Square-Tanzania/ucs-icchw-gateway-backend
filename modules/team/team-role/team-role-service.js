import axios from "axios";
import TeamRoleRepository from "./team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";

class TeamRoleService {
  static async fetchTeamRolesFromOpenMRS() {
    try {
      const url = process.env.OPENMRS_API_URL + "team/teamrole?v=full";
      const response = await axios.get(url, {
        auth: {
          username: process.env.OPENMRS_API_USERNAME,
          password: process.env.OPENMRS_API_PASSWORD,
        },
      });

      const teamRoles = response.data.results.map((role) => ({
        uuid: role.uuid,
        identifier: role.identifier,
        display: role.display,
        name: role.name,
        members: role.members,
        creator: role.auditInfo?.creator,
      }));

      await TeamRoleRepository.upsertTeamRoles(teamRoles);

      return { message: "Team roles synchronized successfully." };
    } catch (error) {
      throw new CustomError("Failed to fetch team roles.", 500);
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
