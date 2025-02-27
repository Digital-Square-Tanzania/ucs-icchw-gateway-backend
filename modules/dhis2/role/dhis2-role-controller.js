import DHIS2RoleService from "./dhis2-role-service.js";
import ResponseHelper from "../../../helpers/response-helper.js";

class DHIS2RoleController {
  static async syncRoles(req, res, next) {
    try {
      await DHIS2RoleService.syncRoles();
      ResponseHelper.success(res, "DHIS2 Roles synced successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async getRoles(req, res, next) {
    try {
      const roles = await DHIS2RoleService.getRoles();
      ResponseHelper.success(res, "DHIS2 Roles retrieved successfully.", roles);
    } catch (error) {
      next(error);
    }
  }
}

export default DHIS2RoleController;
