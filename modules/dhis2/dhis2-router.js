import express from "express";
import DHIS2OrgUnitController from "./org-unit/dhis2-org-unit-controller.js";
import DHIS2RoleController from "./role/dhis2-role-controller.js";
import DHIS2UserController from "./user/dhis2-user-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import PermissionMiddleware from "../../middlewares/permission-middleware.js";

const router = express.Router();

// **Org Units**
router.get("/org-unit/sync", AuthMiddleware.authenticate, DHIS2OrgUnitController.syncOrgUnits);
router.get("/org-unit", AuthMiddleware.authenticate, DHIS2OrgUnitController.getOrgUnits);
router.get("/org-unit/grouped", AuthMiddleware.authenticate, DHIS2OrgUnitController.getGroupedOrgUnits);

// **Roles**
router.get("/role/sync", AuthMiddleware.authenticate, DHIS2RoleController.syncRoles);
router.get("/role", AuthMiddleware.authenticate, DHIS2RoleController.getRoles);

// **Users**
router.get("/user/sync", AuthMiddleware.authenticate, DHIS2UserController.syncUsers);
const dhis2View = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requireUserTab("dhis2", "view"),
];
const dhis2Create = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requireUserTab("dhis2", "create"),
];

router.get("/user", ...dhis2View, DHIS2UserController.getUsers);
router.post("/user", ...dhis2Create, DHIS2UserController.createUser);
router.delete("/user/:id", ...dhis2Create, DHIS2UserController.deleteUser);

export default router;
