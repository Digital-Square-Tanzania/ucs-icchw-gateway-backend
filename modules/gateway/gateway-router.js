import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import OpenMRSGatewayController from "./gateway-controller.js";
import { checkChwMonthlyStatusRateLimiter, registerChwFromHrhisRateLimiter, updateChwDemographicsRateLimiter } from "../../middlewares/ratelimiter-middleware.js";

const router = Router();

// Get CHW activity status by HFR code
router.post("/chw/status", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), checkChwMonthlyStatusRateLimiter, OpenMRSGatewayController.checkChwMonthlyStatus);

// Register new CHW from HRHIS
router.post("/chw/register", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), registerChwFromHrhisRateLimiter, OpenMRSGatewayController.registerChwFromHrhis);

// Update CHW demographics from HRHIS
router.put("/chw/update", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), updateChwDemographicsRateLimiter, OpenMRSGatewayController.updateChwDemographics);

export default router;
