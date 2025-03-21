import axios from "axios";
import dotenv from "dotenv";
import TeamRepository from "./openmrs-openmrs-team-repository.js";
import CustomError from "../../../utils/custom-error.js";

dotenv.config();

class TeamService {
  static async syncTeamsFromOpenMRS() {
    try {
      const url = process.env.OPENMRS_API_URL + "team/team?v=custom:(uuid,display,teamName,teamIdentifier,supervisor,supervisorUuid,voided,voidReason,members,location:(uuid,name),dateCreated)";
      console.log(`🔄 Fetching teams from: ${url}`);

      const response = await axios.get(url, {
        auth: {
          username: process.env.OPENMRS_API_USERNAME,
          password: process.env.OPENMRS_API_PASSWORD,
        },
      });

      if (!response.data.results) {
        throw new CustomError("No team data found in OpenMRS.", 404);
      }

      console.log(`✅ Found ${response.data.results.length} teams. Syncing...`);
      for (const team of response.data.results) {
        await TeamRepository.upsertTeam(team);
      }

      return { message: "Teams synchronized successfully." };
    } catch (error) {
      console.error("❌ Failed to fetch teams:", error.response?.data || error.stack);
      throw new CustomError("Failed to fetch teams.", 500);
    }
  }

  static async getAllTeams(page, limit) {
    return TeamRepository.getAllTeams(page, limit);
  }

  static async getTeamByUuid(uuid) {
    const team = await TeamRepository.getTeamByUuid(uuid);
    if (!team) throw new CustomError("Team not found.", 404);
    return team;
  }
}

export default TeamService;
