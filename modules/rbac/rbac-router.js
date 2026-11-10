import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import PermissionMiddleware from "../../middlewares/permission-middleware.js";
import RbacController from "./rbac-controller.js";

const router = Router();

router.use(AuthMiddleware.authenticate, PermissionMiddleware.loadUserPermissions);

router.get(
  "/roles",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.listRoles,
);
router.get(
  "/permissions",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.listPermissions,
);
router.get("/menus", PermissionMiddleware.requireSettingsTab("rbac"), RbacController.listMenus);
router.post(
  "/permissions",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.createPermission,
);
router.post("/menus", PermissionMiddleware.requireSettingsTab("rbac"), RbacController.createMenu);
router.get(
  "/roles/:id",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.getRoleRbac,
);
router.put(
  "/roles/:id/permissions",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.setRolePermissions,
);
router.put(
  "/roles/:id/menus",
  PermissionMiddleware.requireSettingsTab("rbac"),
  RbacController.setRoleMenus,
);

export default router;
