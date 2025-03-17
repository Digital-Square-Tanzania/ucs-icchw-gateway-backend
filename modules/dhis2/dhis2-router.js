import express from "express";
import DHIS2OrgUnitController from "./org-unit/dhis2-org-unit-controller.js";
import DHIS2RoleController from "./role/dhis2-role-controller.js";
import DHIS2UserController from "./user/dhis2-user-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";

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
router.get("/user", AuthMiddleware.authenticate, DHIS2UserController.getUsers);
router.post("/user", AuthMiddleware.authenticate, DHIS2UserController.createUser);
router.delete("/user/:id", AuthMiddleware.authenticate, DHIS2UserController.deleteUser);

export default router;
