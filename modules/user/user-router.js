import { Router } from "express";
import UserController from "./user-controller.js";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import { createUserRateLimiter, updateUserRateLimiter, deleteUserRateLimiter, searchUserRateLimiter } from "../../middlewares/ratelimiter-middleware.js";
import ValidationMiddleware from "../../middlewares/validation-middleware.js";
import UserValidation from "./user-validation.js";

const router = Router();

// Public User Routes (Require Authentication Only)
router.get(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN", "COUNCIL_COORDINATOR", "FACILITY_PROVIDER"),
  searchUserRateLimiter,
  UserController.getAllUsers
);

router.get("/:id", AuthMiddleware.authenticate, UserController.getUserById);

// Create CHW Route: UCS_DEVELOPER, MOH_ADMIN, and COUNCIL_COORDINATOR can create CHW users
router.post(
  "/chw",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN", "COUNCIL_COORDINATOR", "FACILITY_PROVIDER"),
  createUserRateLimiter,
  ...ValidationMiddleware.sanitizeUserInputs(), // Spread the array of sanitization middleware
  ValidationMiddleware.validate(UserValidation.createChwSchema()), // Joi validation
  UserController.createChwAccount
);

// Create Route: MOH_ADMIN, COUNCIL_COORDINATOR, and FACILITY_PROVIDER can create users
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("MOH_ADMIN", "COUNCIL_COORDINATOR", "FACILITY_PROVIDER"),
  createUserRateLimiter,
  ...ValidationMiddleware.sanitizeUserInputs(), // Spread the array of sanitization middleware
  ValidationMiddleware.validate(UserValidation.createUserSchema()), // Joi validation
  UserController.createUser
);

// Update Route: Accessible to all authenticated users (no role check)
router.put("/:id", AuthMiddleware.authenticate, updateUserRateLimiter, UserController.updateUser);

// Delete Route: Only UCS_DEVELOPER can delete users
router.delete("/:id", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), deleteUserRateLimiter, UserController.deleteUser);

// Activate new CHW account route
router.get("/chw/activate/:slug", UserController.renderActivationPage);

// Handle new Activation route
router.post("/chw/activate/:slug", UserController.activateChwAccount);

// Handle email resend route
router.get("/chw/resend/:slug", UserController.resendActivationEmail);

// Handle forgotten password
router.get("/chw/forgot/:username", UserController.forgotPassword);

// Reset password page route
router.get("/chw/reset/:slug", UserController.renderActivationPage);

export default router;
