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

// Create Route: MOH_ADMIN, COUNCIL_COORDINATOR and FACILITY_PROVIDER can create users
router.post(
  "/",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("MOH_ADMIN", "COUNCIL_COORDINATOR", "FACILITY_PROVIDER"),
  createUserRateLimiter,
  ValidationMiddleware.sanitizeUserInputs(),
  ValidationMiddleware.validate(UserValidation.createUserSchema()),
  UserController.createUser
);

// Update Route: Accessible to all authenticated users (no role check)
router.put("/:id", AuthMiddleware.authenticate, updateUserRateLimiter, UserController.updateUser);

// Delete Route: Only UCS_DEVELOPER can delete users
router.delete("/:id", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), deleteUserRateLimiter, UserController.deleteUser);

export default router;
