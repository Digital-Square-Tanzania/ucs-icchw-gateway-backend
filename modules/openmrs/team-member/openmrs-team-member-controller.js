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

  // Delete a person by ID
  static async deletePerson(req, res, next) {
    try {
      const { maxPersonId } = req.params;
      const maxId = parseInt(maxPersonId);
      for (let personId = 2; personId <= maxId; personId++) {
        await TeamMemberService.deletePerson(personId);
      }
      return BaseResponse.success(res, `Persons deleted successfully from 2 to ${maxId}`);
    } catch (error) {
      next(error);
    }
  }

  // Check for username availability
  static async checkUsernameAvailability(req, res, next) {
    try {
      const { username } = req.query;
      if (!username) {
        return BaseResponse.error(res, "Username is required", 400);
      }
      // Check if the username is available
      const isAvailable = await TeamMemberService.isUsernameAvailable(username);
      return BaseResponse.success(res, "Username availability checked", { isAvailable });
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Upload CSV file
  static async uploadCsv(req, res, next) {
    try {
      if (!req.file) {
        return BaseResponse.error(res, "No file uploaded", 400);
      }
      const csvData = await TeamMemberService.processCsv(req);
      return BaseResponse.success(res, "CSV file processed successfully", csvData);
    } catch (error) {
      next(error);
    }
  }

  // Get team member by team UUID
  static async getTeamMembersByTeamUuid(req, res, next) {
    try {
      const { teamUuid } = req.params;
      const teamMembers = await TeamMemberService.getTeamMembersByTeamUuid(teamUuid);
      return BaseResponse.success(res, "Team members retrieved successfully", teamMembers);
    } catch (error) {
      next(error);
    }
  }
}

export default TeamMemberController;
