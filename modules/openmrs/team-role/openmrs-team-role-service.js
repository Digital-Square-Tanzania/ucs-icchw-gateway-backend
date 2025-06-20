import axios from "axios";
import TeamRoleRepository from "./openmrs-team-role-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";

class TeamRoleService {
  static async syncTeamRolesFromOpenMRS() {
    try {
      // const url = process.env.OPENMRS_API_URL + "team/teamrole?v=full";
      // const response = await axios.get(url, {
      //   auth: {
      //     username: process.env.OPENMRS_API_USERNAME,
      //     password: process.env.OPENMRS_API_PASSWORD,
      //   },
      // });

      // const teamRoles = response.data.results.map((role) => ({
      //   uuid: role.uuid,
      //   identifier: role.identifier,
      //   display: role.display,
      //   name: role.name,
      //   members: role.members,
      //   creator: role.auditInfo?.creator,
      // }));

      const teamRoles2 = await openmrsApiClient.get("team/teamrole", { v: "custom:(uuid,identifier,name,display,auditInfo:(creator))" });
      const teamRoles = JSON.stringify(teamRoles2, null, 3);
      console.log("Team roles fetched from OpenMRS:", teamRoles);
      console.log("Team roles 2 fetched from OpenMRS:", teamRoles2);

      // await TeamRoleRepository.upsertTeamRoles(teamRoles);

      return { message: "Team roles synchronized successfully.", teamRoles: JSON.stringify(teamRoles2.results[0], null, 2) };
    } catch (error) {
      throw new CustomError("Failed to fetch team roles." + error.stack, 500);
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
