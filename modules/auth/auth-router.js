import { Router } from "express";
import AuthController from "./auth-controller.js";
import AuthMiddleware from "../../middlewares/authentication.js";

const router = Router();

router.post("/login", AuthController.login);
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);
router.post("/logout/all", AuthMiddleware.authenticate, AuthController.logoutAll);

// Protected route to get user details (Requires authentication)
router.get("/me", AuthMiddleware.authenticate, AuthController.getProfile);

export default router;
