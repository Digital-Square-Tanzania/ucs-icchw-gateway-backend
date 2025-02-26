import { Router } from "express";
import UserRoleController from "./user-role-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, UserRoleController.getAllUserRoles);
router.get("/:id", AuthMiddleware.authenticate, UserRoleController.getUserRoleById);
router.post("/sync", AuthMiddleware.authenticate, UserRoleController.syncUserRoles);

export default router;
