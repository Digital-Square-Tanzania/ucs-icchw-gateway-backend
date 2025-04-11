import TeamService from "./openmrs-team-service.js";
import BaseResponse from "../../../responders/base-responder.js";

class TeamController {
  static async syncTeams(req, res, next) {
    try {
      const result = await TeamService.syncTeamsFromOpenMRS();
      return BaseResponse.success(res, result.message);
    } catch (error) {
      return BaseResponse.error(res, error.message, error.statusCode);
    }
  }

  static async getAllTeams(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const teams = await TeamService.getAllTeams(page, limit);
      return BaseResponse.success(res, "Teams retrieved successfully", teams);
    } catch (error) {
      return BaseResponse.error(res, error.message, error.statusCode);
    }
  }

  static async getTeamByUuid(req, res, next) {
    try {
      const team = await TeamService.getTeamByUuid(req.params.uuid);
      return BaseResponse.success(res, "Team retrieved successfully", team);
    } catch (error) {
      return BaseResponse.error(res, error.message, error.statusCode);
    }
  }
}

export default TeamController;
