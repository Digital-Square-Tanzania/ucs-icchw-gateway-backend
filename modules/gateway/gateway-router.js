import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import OpenMRSGatewayController from "./gateway-controller.js";

const router = Router();

// Get CHW activity status by HFR code
router.post("/chw/status", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), OpenMRSGatewayController.checkChwMonthlyStatus);

export default router;
