import TeamMemberService from "./team-member-service.js";
import ResponseHelper from "../../../helpers/response-helper.js";

/*
 * Controller for handling team member related operations
 */
class TeamMemberController {
  static async syncTeamMembers(req, res, next) {
    try {
      await TeamMemberService.syncTeamMembers();
      return ResponseHelper.success(res, "Team members synced successfully from OpenMRS.");
    } catch (error) {
      next(error);
    }
  }

  // Get team member by UUID
  static async getTeamMemberByUuid(req, res, next) {
    try {
      const { uuid } = req.params;
      const teamMember = await TeamMemberService.getTeamMemberByUuid(uuid);
      return ResponseHelper.success(res, "Team member retrieved successfully", teamMember);
    } catch (error) {
      next(error);
    }
  }

  // Create a new team member
  static async createTeamMember(req, res, next) {
    try {
      const teamMemberData = req.body;
      const createdMember = await TeamMemberService.createTeamMember(teamMemberData);
      return ResponseHelper.success(res, "Team member created successfully", createdMember);
    } catch (error) {
      next(error);
    }
  }

  static async updateTeamMember(req, res, next) {
    try {
      const { uuid } = req.params;
      const updateData = req.body;
      const updatedMember = await TeamMemberService.updateTeamMember(uuid, updateData);
      return ResponseHelper.success(res, "Team member updated successfully", updatedMember);
    } catch (error) {
      next(error);
    }
  }
}

export default TeamMemberController;
