import { Router } from "express";
import TeamMemberController from "./openmrs-team-member-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, TeamMemberController.getTeamMembers);
router.post("/", AuthMiddleware.authenticate, TeamMemberController.createTeamMember);
router.get("/sync", AuthMiddleware.authenticate, TeamMemberController.syncTeamMembers);
router.put("/:uuid", AuthMiddleware.authenticate, TeamMemberController.updateTeamMember);
router.get("/:uuid", AuthMiddleware.authenticate, TeamMemberController.getTeamMemberByUuid);
router.delete("/person/:personId", AuthMiddleware.authenticate, TeamMemberController.deletePerson);

export default router;
