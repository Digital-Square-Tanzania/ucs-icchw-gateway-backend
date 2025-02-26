import { Router } from "express";
import TeamMemberController from "./team-member-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.post("/sync", AuthMiddleware.authenticate, TeamMemberController.syncTeamMembers);
router.get("/:uuid", AuthMiddleware.authenticate, TeamMemberController.getTeamMemberByUuid);
router.post("/", AuthMiddleware.authenticate, TeamMemberController.createTeamMember);
router.put("/:uuid", AuthMiddleware.authenticate, TeamMemberController.updateTeamMember);

export default router;
