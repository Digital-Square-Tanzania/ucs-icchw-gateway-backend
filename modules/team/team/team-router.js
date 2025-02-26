import { Router } from "express";
import TeamController from "./team-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.get("/sync", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), TeamController.syncTeams);
router.get("/", AuthMiddleware.authenticate, TeamController.getAllTeams);
router.get("/:uuid", AuthMiddleware.authenticate, TeamController.getTeamByUuid);

export default router;
