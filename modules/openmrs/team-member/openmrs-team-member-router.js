import { Router } from "express";
import TeamMemberController from "./openmrs-team-member-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, TeamMemberController.getTeamMembers);
router.post("/", AuthMiddleware.authenticate, TeamMemberController.createTeamMember);
router.get("/sync", AuthMiddleware.authenticate, TeamMemberController.syncTeamMembers);
router.put("/:uuid", AuthMiddleware.authenticate, TeamMemberController.updateTeamMember);
router.get("/:uuid", AuthMiddleware.authenticate, TeamMemberController.getTeamMemberByUuid);
router.delete("/person/:maxPersonId", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), TeamMemberController.deletePerson);

// Check for username availability
router.get("/username/search", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN"), TeamMemberController.checkUsernameAvailability);

export default router;
