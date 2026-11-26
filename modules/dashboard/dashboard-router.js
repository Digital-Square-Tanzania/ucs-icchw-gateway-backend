import express from "express";
import DashboardController from "./dashboard-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import PermissionMiddleware from "../../middlewares/permission-middleware.js";
import BaseResponse from "../../responders/base-responder.js";
import { dashboardSyncPermission } from "../../utils/dashboard-sync-permissions.js";

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

const analyticsChartAccess = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requireAnalyticsTab("hrhis"),
];

router.get(
  "/hrhis-register-timeseries",
  ...analyticsChartAccess,
  DashboardController.getHrhisRegisterTimeseries
);

router.post(
  "/sync",
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  (req, res, next) => {
    const code = dashboardSyncPermission(req.body?.path);
    if (code && (req.userPermissions || []).includes(code)) return next();
    return BaseResponse.error(res, "Access denied. Missing permission.", 403);
  },
  DashboardController.syncDashboard,
);

export default router;
