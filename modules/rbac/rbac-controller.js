import BaseResponse from "../../responders/base-responder.js";
import CustomError from "../../utils/custom-error.js";
import RbacService from "./rbac-service.js";

class RbacController {
  static async listRoles(req, res, next) {
    try {
      const roles = await RbacService.listRoles();
      return BaseResponse.success(res, "Roles loaded", roles);
    } catch (error) {
      next(error);
    }
  }

  static async listPermissions(req, res, next) {
    try {
      const list = await RbacService.listPermissions();
      return BaseResponse.success(res, "Permissions loaded", list);
    } catch (error) {
      next(error);
    }
  }

  static async listMenus(req, res, next) {
    try {
      const list = await RbacService.listMenus();
      return BaseResponse.success(res, "Menus loaded", list);
    } catch (error) {
      next(error);
    }
  }

  static async createPermission(req, res, next) {
    try {
      const { code, name, description } = req.body || {};
      if (!code?.trim()) throw new CustomError("Permission code is required.", 400);
      const created = await RbacService.createPermission({ code, name, description });
      return BaseResponse.success(res, "Permission created", created, 201);
    } catch (error) {
      next(error);
    }
  }

  static async createMenu(req, res, next) {
    try {
      const { label, path, icon, order } = req.body || {};
      if (!label?.trim() || !path?.trim()) throw new CustomError("Menu label and path are required.", 400);
      const created = await RbacService.createMenu({ label, path, icon, order });
      return BaseResponse.success(res, "Menu created", created, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getRoleRbac(req, res, next) {
    try {
      const roleId = Number(req.params.id);
      if (!Number.isFinite(roleId)) throw new CustomError("Invalid role id.", 400);
      const role = await RbacService.getRoleWithRbac(roleId);
      if (!role) throw new CustomError("Role not found.", 404);
      return BaseResponse.success(res, "Role RBAC loaded", role);
    } catch (error) {
      next(error);
    }
  }

  static async setRolePermissions(req, res, next) {
    try {
      const roleId = Number(req.params.id);
      const { permissionIds } = req.body || {};
      if (!Number.isFinite(roleId)) throw new CustomError("Invalid role id.", 400);
      if (!Array.isArray(permissionIds)) throw new CustomError("permissionIds array required.", 400);
      const perms = await RbacService.replaceRolePermissions(roleId, permissionIds);
      return BaseResponse.success(res, "Role permissions updated", perms);
    } catch (error) {
      next(error);
    }
  }

  static async setRoleMenus(req, res, next) {
    try {
      const roleId = Number(req.params.id);
      const { menuIds } = req.body || {};
      if (!Number.isFinite(roleId)) throw new CustomError("Invalid role id.", 400);
      if (!Array.isArray(menuIds)) throw new CustomError("menuIds array required.", 400);
      const menus = await RbacService.replaceRoleMenus(roleId, menuIds);
      return BaseResponse.success(res, "Role menus updated", menus);
    } catch (error) {
      next(error);
    }
  }
}

export default RbacController;
