import DHIS2RoleService from "./dhis2-role-service.js";
import BaseResponse from "../../../responders/base-responder.js";

class DHIS2RoleController {
  static async syncRoles(_req, res, next) {
    try {
      await DHIS2RoleService.syncRoles();
      BaseResponse.success(res, "DHIS2 Roles synced successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async getRoles(req, res, next) {
    try {
      const roles = await DHIS2RoleService.getRoles();
      BaseResponse.success(res, "DHIS2 Roles retrieved successfully.", roles);
    } catch (error) {
      next(error);
    }
  }
}

export default DHIS2RoleController;
