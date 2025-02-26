import UserRoleService from "./user-role-service.js";
import ResponseHelper from "../../../helpers/response-helper.js";

class UserRoleController {
  static async getAllUserRoles(_req, res, next) {
    try {
      const roles = await UserRoleService.getAllUserRoles();
      return ResponseHelper.success(res, "User roles retrieved successfully", roles);
    } catch (error) {
      next(error);
    }
  }

  static async getUserRoleById(req, res, next) {
    try {
      const role = await UserRoleService.getUserRoleById(parseInt(req.params.id));
      return ResponseHelper.success(res, "User role retrieved successfully", role);
    } catch (error) {
      next(error);
    }
  }

  static async syncUserRoles(_req, res, next) {
    try {
      const message = await UserRoleService.syncUserRolesFromOpenMRS();
      return ResponseHelper.success(res, message.message);
    } catch (error) {
      next(error);
    }
  }
}

export default UserRoleController;
