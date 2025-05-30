import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import BasicAuthMiddleware from "../../middlewares/basic-auth-middleware.js";
import GatewayController from "./gateway-controller.js";
import { checkChwMonthlyStatusRateLimiter, registerChwFromHrhisRateLimiter, updateChwDemographicsRateLimiter, changeChwDutyStationRateLimiter } from "../../middlewares/ratelimiter-middleware.js";

const router = Router();

// Get CHW activity status by HFR code
router.post("/chw/status", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), checkChwMonthlyStatusRateLimiter, GatewayController.checkChwMonthlyStatus);

// Register new CHW from HRHIS
router.post("/chw/register", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), registerChwFromHrhisRateLimiter, GatewayController.registerChwFromHrhis);

// Update CHW demographics from HRHIS
router.put("/chw/update", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), updateChwDemographicsRateLimiter, GatewayController.updateChwDemographics);

// Change CHW duty station
router.put("/chw/station", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), changeChwDutyStationRateLimiter, GatewayController.changeChwDutyStation);

// Test Message Signing
router.post("/signature/test", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.testSignature);

// Verify Message Signature
router.post("/signature/verify", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.verifySignature);

// Sign Message
router.post("/signature/sign", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.signMessage);

export default router;
