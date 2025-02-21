import { Router } from "express";
import AuthController from "./auth-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";

const router = Router();

// Login Route
router.post("/login", AuthController.login);

// Refresh Token Route
router.post("/refresh-token", AuthController.refreshToken);

// Logout Route
router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

// Logout from All Devices
router.post("/logout-all", AuthMiddleware.authenticate, AuthController.logoutAll);

// Get Profile
router.get("/me", AuthMiddleware.authenticate, AuthController.getProfile);

export default router;
