import { Router } from "express";
import MemberRoleController from "./openmrs-member-role-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, MemberRoleController.getAllMemberRoles);
router.get("/:id", AuthMiddleware.authenticate, MemberRoleController.getMemberRoleById);
router.post("/sync", AuthMiddleware.authenticate, MemberRoleController.syncMemberRoles);

export default router;
