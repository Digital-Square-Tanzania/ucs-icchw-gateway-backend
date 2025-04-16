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

// Sync dashboard data (MOH_ADMIN and UCS_DEVELOPER roles)
router.post("/sync", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("MOH_ADMIN", "UCS_DEVELOPER"), DashboardController.syncDashboard);

export default router;
