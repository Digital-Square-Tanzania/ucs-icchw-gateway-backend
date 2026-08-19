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
router.post("/signature/verify-ffars", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.verifyMessageFromFfars);

// Verify Message Signature from UCS
router.post("/signature/verify-ucs", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.verifyMessageFromUcs);

// Sign Message
router.post("/signature/sign", BasicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), GatewayController.signMessage);

router.get(
  "/admin/hrhis-council-analytics",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("MOH_ADMIN", "UCS_DEVELOPER"),
  GatewayController.getHrhisCouncilAnalytics
);

// Admin: scan / recover location-related HRHIS register failures from api_logs
router.get(
  "/admin/hrhis-location-failures",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("MOH_ADMIN", "UCS_DEVELOPER"),
  GatewayController.scanHrhisLocationFailures
);
router.post(
  "/admin/hrhis-location-failures/recover",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("MOH_ADMIN", "UCS_DEVELOPER"),
  GatewayController.recoverHrhisLocationFailures
);

export default router;
