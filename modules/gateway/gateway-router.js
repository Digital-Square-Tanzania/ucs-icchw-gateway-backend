import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import BasicAuthMiddleware from "../../middlewares/basic-auth-middleware.js";
import OpenMRSGatewayController from "./gateway-controller.js";
import { checkChwMonthlyStatusRateLimiter, registerChwFromHrhisRateLimiter, updateChwDemographicsRateLimiter, changeChwDutyStationRateLimiter } from "../../middlewares/ratelimiter-middleware.js";

const router = Router();

// Get CHW activity status by HFR code
router.post("/chw/status", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), checkChwMonthlyStatusRateLimiter, OpenMRSGatewayController.checkChwMonthlyStatus);

// Register new CHW from HRHIS
router.post("/chw/register", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), registerChwFromHrhisRateLimiter, OpenMRSGatewayController.registerChwFromHrhis);

// Update CHW demographics from HRHIS
router.put("/chw/update", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), updateChwDemographicsRateLimiter, OpenMRSGatewayController.updateChwDemographics);

// Change CHW duty station
router.put("/chw/station", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), changeChwDutyStationRateLimiter, OpenMRSGatewayController.changeChwDutyStation);

export default router;
