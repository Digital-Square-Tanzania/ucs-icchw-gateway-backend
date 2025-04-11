import TeamMemberService from "./openmrs-team-member-service.js";
import BaseResponse from "../../../responders/base-responder.js";

/*
 * Controller for handling team member related operations
 */
class TeamMemberController {
  // Get all team members
  static async getTeamMembers(req, res, next) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const teamMembers = await TeamMemberService.getTeamMembers(parseInt(page), parseInt(pageSize));
      return BaseResponse.success(res, "Team members retrieved successfully", teamMembers);
    } catch (error) {
      next(error);
    }
  }

  // Sync team members from OpenMRS
  static async syncTeamMembers(req, res, next) {
    try {
      const pageSize = req.query.pageSize;
      await TeamMemberService.syncTeamMembers(parseInt(pageSize));
      return BaseResponse.success(res, "Team members synced successfully from OpenMRS.");
    } catch (error) {
      next(error);
    }
  }

  // Get team member by UUID
  static async getTeamMemberByUuid(req, res, next) {
    try {
      const { uuid } = req.params;
      const teamMember = await TeamMemberService.getTeamMemberByUuid(uuid);
      return BaseResponse.success(res, "Team member retrieved successfully", teamMember);
    } catch (error) {
      next(error);
    }
  }

  // Create a new team member
  static async createTeamMember(req, res, next) {
    try {
      const teamMemberData = req.body;
      const createdMember = await TeamMemberService.createTeamMember(teamMemberData);
      return BaseResponse.success(res, "Team member created successfully", createdMember);
    } catch (error) {
      next(error);
    }
  }

  // Update team member by UUID
  static async updateTeamMember(req, res, next) {
    try {
      const { uuid } = req.params;
      const updateData = req.body;
      const updatedMember = await TeamMemberService.updateTeamMember(uuid, updateData);
      return BaseResponse.success(res, "Team member updated successfully", updatedMember);
    } catch (error) {
      next(error);
    }
  }
}

export default TeamMemberController;
