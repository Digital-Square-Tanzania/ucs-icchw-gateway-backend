import ResponseHelper from "../../../helpers/response-helper.js";
import CustomError from "../../../utils/custom-error.js";
import TeamRoleService from "./openmrs-team-role-service.js";

class TeamRoleController {
  /**
   * Synchronizes team roles from OpenMRS.
   * @param {Object} _req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   */
  static async syncTeamRoles(_req, res, next) {
    try {
      const result = await TeamRoleService.syncTeamRolesFromOpenMRS();
      ResponseHelper.success(res, "Roles fetched successfully.", result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all team roles.
   *
   * @param {Object} _req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   * @returns {Promise<void>}
   */
  static async getAllTeamRoles(_req, res, next) {
    try {
      const teamRoles = await TeamRoleService.getAllTeamRoles();
      ResponseHelper.success(res, "Team roles retrieved successfully.", teamRoles, 200);
    } catch (error) {
      next(error);
    }
  }
  /**
   * Retrieves a team role by its UUID.
   * @param {Object} req - The request object.
   * @param {Object} req.params - The request parameters.
   * @param {string} req.params.uuid - The UUID of the team role.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   */
  static async getTeamRoleByUUID(req, res, next) {
    try {
      const { uuid } = req.params;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        throw new CustomError("Invalid UUID format", 400);
      }
      const teamRole = await TeamRoleService.getTeamRoleByUUID(uuid);
      ResponseHelper.success(res, "Team role retrieved successfully.", teamRole, 200);
    } catch (error) {
      next(error);
    }
  }
}

export default TeamRoleController;
