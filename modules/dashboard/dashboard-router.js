import express from "express";
import DashboardController from "./dashboard-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import PermissionMiddleware from "../../middlewares/permission-middleware.js";

const router = express.Router();

const dashboardAccess = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requirePermission("menu:dashboard"),
];

/**
 * @route GET /dashboard
 * @desc Get dashboard statistics
 * @access Protected (requires authentication)
 */
router.get("/stats", ...dashboardAccess, DashboardController.getDashboardStats);

router.get(
  "/hrhis-register-timeseries",
  ...dashboardAccess,
  DashboardController.getHrhisRegisterTimeseries
);

// Sync dashboard data (MOH_ADMIN and UCS_DEVELOPER roles)
router.post("/sync", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("MOH_ADMIN", "UCS_DEVELOPER"), DashboardController.syncDashboard);

export default router;
