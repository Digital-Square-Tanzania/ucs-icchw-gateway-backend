import BaseResponse from "../responders/base-responder.js";
import RbacService from "../modules/rbac/rbac-service.js";
import AuthRepository from "../modules/auth/auth-repository.js";
import { hasSettingsTabAccess } from "../utils/settings-tab-permissions.js";

class PermissionMiddleware {
  static async loadUserPermissions(req, res, next) {
    try {
      if (!req.user?.id) {
        return BaseResponse.error(res, "Authentication required.", 401);
      }
      const codes = await RbacService.getPermissionCodesForUserId(req.user.id);
      req.userPermissions = codes;
      const dbUser = await AuthRepository.findUserById(req.user.id);
      req.managerUser = dbUser
        ? {
            roleName: dbUser.role?.name,
            assignedRegion: dbUser.assignedRegion,
            assignedDistrict: dbUser.assignedDistrict,
            assignedCouncil: dbUser.assignedCouncil,
          }
        : null;
      next();
    } catch (error) {
      next(error);
    }
  }

  static requirePermission(code) {
    return (req, res, next) => {
      const permissions = req.userPermissions || [];
      if (permissions.includes("settings:manage") || permissions.includes(code)) {
        return next();
      }
      return BaseResponse.error(res, "Access denied. Missing permission.", 403);
    };
  }

  static requireSettingsTab(tab) {
    return (req, res, next) => {
      const permissions = req.userPermissions || [];
      if (hasSettingsTabAccess(permissions, tab)) return next();
      return BaseResponse.error(res, "Access denied. Settings tab not permitted.", 403);
    };
  }
}

export default PermissionMiddleware;
