import MemberRoleService from "./openmrs-member-role-service.js";
import BaseResponse from "../../../responders/base-responder.js";

class MemberRoleController {
  static async getAllMemberRoles(_req, res, next) {
    try {
      const roles = await MemberRoleService.getAllMemberRoles();
      return BaseResponse.success(res, "Member roles retrieved successfully", roles);
    } catch (error) {
      next(error);
    }
  }

  static async getMemberRoleById(req, res, next) {
    try {
      const role = await MemberRoleService.getMemberRoleById(parseInt(req.params.id));
      return BaseResponse.success(res, "Member role retrieved successfully", role);
    } catch (error) {
      next(error);
    }
  }

  static async syncMemberRoles(_req, res, next) {
    try {
      const message = await MemberRoleService.syncMemberRolesFromOpenMRS();
      return BaseResponse.success(res, message.message);
    } catch (error) {
      next(error);
    }
  }
}

export default MemberRoleController;
