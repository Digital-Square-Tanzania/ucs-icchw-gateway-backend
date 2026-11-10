import dotenv from "dotenv";
import TeamRepository from "./openmrs-team-repository.js";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import mysqlClient from "../../../utils/mysql-client.js";

dotenv.config();

const TEAM_UPSERT_CHUNK = 100;

class TeamService {
  static async syncTeamsFromOpenMRS() {
    return TeamService.syncTeamsFromDb();
  }

  static async syncTeamsFromDb() {
    let connection;
    try {
      console.log("🚀 Fast-syncing OpenMRS teams directly from MySQL...");

      connection = await mysqlClient.getConnection();
      await connection.query("USE openmrs");

      const [rows] = await connection.query(`
        SELECT
          t.team_id,
          t.uuid,
          t.name,
          t.identifier,
          COALESCE(t.voided, 0) AS voided,
          t.void_reason,
          t.date_created,
          l.uuid AS location_uuid,
          l.name AS location_name,
          (
            SELECT COUNT(*)
            FROM team_member tm
            WHERE tm.team_id = t.team_id
              AND COALESCE(tm.voided, 0) = 0
          ) AS member_count
        FROM team t
        LEFT JOIN location l ON l.location_id = t.location_id
        ORDER BY t.team_id
      `);

      const teams = (rows || []).map((row) => {
        const teamName = row.name || "";
        return {
          uuid: row.uuid,
          display: teamName ? `${teamName} - ${row.uuid}` : row.uuid,
          teamName,
          teamIdentifier: row.identifier || null,
          supervisor: null,
          supervisorUuid: null,
          voided: Boolean(Number(row.voided)),
          voidReason: row.void_reason || null,
          members: Number(row.member_count) || 0,
          location: {
            uuid: row.location_uuid || null,
            name: row.location_name || null,
          },
          dateCreated: row.date_created,
        };
      });

      for (let i = 0; i < teams.length; i += TEAM_UPSERT_CHUNK) {
        const chunk = teams.slice(i, i + TEAM_UPSERT_CHUNK);
        await Promise.all(chunk.map((team) => TeamRepository.upsertTeam(team)));
      }

      console.log(`✅ Fast team sync complete: ${teams.length} team(s).`);
      return { message: `${teams.length} teams synchronized successfully.` };
    } catch (error) {
      console.error("❌ Failed to fast-sync teams:", error.message);
      throw new CustomError("Failed to fetch teams.", 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /** Legacy REST sync; prefer {@link syncTeamsFromDb}. */
  static async syncTeamsViaApi() {
    try {
      const openmrsTeams = await openmrsApiClient.get(
        "team/team?v=custom:(uuid,display,teamName,teamIdentifier,supervisor,supervisorUuid,voided,voidReason,members,location:(uuid,name),dateCreated"
      );
      if (!openmrsTeams.results) {
        throw new CustomError("No team data found in OpenMRS.", 404);
      }
      await Promise.all(openmrsTeams.results.map((team) => TeamRepository.upsertTeam(team)));
      return { message: `${openmrsTeams.results.length} teams synchronized successfully.` };
    } catch (error) {
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

  static async createTeam(location) {
    // create team
    const teamObject = {};
    const teamName = location.name + "-Team";
    const teamIdentifier = (location.name + " - Team").replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
    teamObject.location = location.uuid;
    teamObject.teamName = teamName;
    teamObject.teamIdentifier = teamIdentifier;

    // Send the request to OpenMRS server using OpenMRS API Client
    const newTeam = await openmrsApiClient.post("team/team", teamObject);

    // Save the returned object as a new team in the database
    const localTeam = await TeamRepository.upsertTeam(newTeam);
    return localTeam;
  }
}

export default TeamService;
