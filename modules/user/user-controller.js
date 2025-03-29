import UserService from "./user-service.js";
import ResponseHelper from "../../helpers/response-helper.js";
import CustomError from "../../utils/custom-error.js";

class UserController {
  /**
   * Create a new backend user
   */
  static async createUser(req, res, next) {
    try {
      const newUser = await UserService.createUser(req.body);
      return ResponseHelper.success(res, "User created successfully", newUser);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * List all users with pagination
   */
  static async getAllUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const usersData = await UserService.getAllUsers(page, limit);
      return ResponseHelper.success(res, "Users retrieved successfully", usersData);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      if (!user) {
        throw new CustomError("User not found", 404);
      }
      return ResponseHelper.success(res, "User retrieved successfully", user);
    } catch (error) {
      next(error); // Directly pass error to ErrorHandler
    }
  }

  /**
   * Update user by ID
   */
  static async updateUser(req, res, next) {
    try {
      const updatedUser = await UserService.updateUser(req.params.id, req.body);
      return ResponseHelper.success(res, "User updated successfully", updatedUser);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Delete user by ID
   */
  static async deleteUser(req, res, next) {
    try {
      await UserService.deleteUser(req.params.id);
      return ResponseHelper.success(res, "User deleted successfully");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Activate user account
   */
  static async renderActivationPage(req, res, next) {
    try {
      const result = await UserService.renderActivationPage(req, res, next);
      res.render("activate-chw-account", { ...result });
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Activate new CHW account
  static async activateChwAccount(req, res, next) {
    try {
      const { slug, password, confirmPassword } = req.body;
      const result = await UserService.activateChwAccount(slug, password, confirmPassword);
      return res.render("activate-chw-account", { ...result });
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Resend activation email
   */
  static async resendActivationEmail(req, res, next) {
    try {
      const result = await UserService.handleResendEmail(req, res, next);
      return res.render("activate-chw-account", { ...result });
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Handle forgotten password
   */
  static async forgotPassword(req, res, next) {
    try {
      const result = await UserService.handleForgotPassword(req, res, next);
      return ResponseHelper.success(res, "Password reset email sent successfully", result, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Create a new CHW account
   */
  static async createChwAccount(req, res, next) {
    try {
      const result = await UserService.createChwAccount(req, res, next);
      return ResponseHelper.success(res, "CHW account created successfully.", result, 201);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }
}

export default UserController;
