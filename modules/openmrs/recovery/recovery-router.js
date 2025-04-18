import { Router } from "express";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";
import RecoveryController from "./recovery-controller.js";

const router = Router();

// Get CHW activity status by HFR code
router.post("/person", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), RecoveryController.addPeopleInOpenmrs);

// Create recovered accounts
router.post("/recovered-accounts", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), RecoveryController.createRecoveredAccounts);

export default router;
