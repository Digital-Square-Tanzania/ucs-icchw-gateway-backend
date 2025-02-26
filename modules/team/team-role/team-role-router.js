import { Router } from "express";
import TeamRoleController from "./team-role-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

// Fetch and sync team roles from OpenMRS
router.get("/sync", AuthMiddleware.authenticate, TeamRoleController.syncTeamRoles);

// Get all team roles
router.get("/", AuthMiddleware.authenticate, TeamRoleController.getAllTeamRoles);

// Get a specific team role by UUID
router.get("/:uuid", AuthMiddleware.authenticate, TeamRoleController.getTeamRoleByUUID);

export default router;
