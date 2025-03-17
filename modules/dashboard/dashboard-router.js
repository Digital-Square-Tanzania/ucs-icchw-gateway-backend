import express from "express";
import DashboardController from "./dashboard-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";

const router = express.Router();

/**
 * @route GET /dashboard
 * @desc Get dashboard statistics
 * @access Protected (requires authentication)
 */
router.get("/stats", AuthMiddleware.authenticate, DashboardController.getDashboardStats);

export default router;
