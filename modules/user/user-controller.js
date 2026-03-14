import UserService from "./user-service.js";
import BaseResponse from "../../responders/base-responder.js";
import CustomError from "../../utils/custom-error.js";
import resendActivationCron from "../../utils/resend-activation-cron.js";

class UserController {
  /**
   * Create a new backend user
   */
  static async createUser(req, res, next) {
    try {
      const newUser = await UserService.createUser(req.body);
      return BaseResponse.success(res, "User created successfully", newUser);
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
      return BaseResponse.success(res, "Users retrieved successfully", usersData);
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
      return BaseResponse.success(res, "User retrieved successfully", user);
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
      return BaseResponse.success(res, "User updated successfully", updatedUser);
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
      return BaseResponse.success(res, "User deleted successfully");
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
      return BaseResponse.success(res, "Password reset email sent successfully", result, 200);
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
      return BaseResponse.success(res, "CHW account created successfully.", result, 201);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Render simple admin login page for email control & future tools.
   */
  static async renderAdminLoginPage(req, res, next) {
    try {
      return res.render("admin-login");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Render CHW activation email control dashboard (Pug).
   */
  static async renderActivationEmailControlPage(req, res, next) {
    try {
      const stats = await UserService.getActivationEmailStats();
      const schedule = resendActivationCron.getScheduleConfig();
      const lang = (req.query.lang || req.cookies?.lang || "en").toLowerCase() === "sw" ? "sw" : "en";
      // Persist chosen language for subsequent requests
      res.cookie("lang", lang, { httpOnly: false, sameSite: "lax" });
      return res.render("activation-email-control", {
        stats,
        schedule,
        lang,
      });
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Activation email stats + schedule (for AJAX).
   */
  static async getActivationEmailStats(req, res, next) {
    try {
      const region = req.query?.region ?? "";
      const district = req.query?.district ?? "";
      const council = req.query?.council ?? "";
      const opts = council ? { region, district, council } : {};
      const stats = await UserService.getActivationEmailStats(opts);
      const schedule = resendActivationCron.getScheduleConfig();
      return BaseResponse.success(res, "Activation email stats loaded", { stats, schedule }, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Activation matrix for GitHub-style heatmap.
   */
  static async getActivationMatrix(req, res, next) {
    try {
      const days = Number(req.query?.days) || 90;
      const matrix = await UserService.getActivationMatrix(days);
      return BaseResponse.success(res, "Activation matrix loaded", { days, matrix }, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Run a single batch of expired activation resends (manual trigger).
   */
  static async resendExpiredActivationsBatch(req, res, next) {
    try {
      const limit = Number(req.body?.limit) > 0 ? Number(req.body.limit) : 100;
      const summary = await UserService.resendExpiredActivationsBatch(limit);
      return BaseResponse.success(res, "Expired activation resend batch completed", summary, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Run a single batch of open (non-expired), not-used activation resends.
   */
  static async resendOpenActivationsBatch(req, res, next) {
    try {
      const limit = Number(req.body?.limit) > 0 ? Number(req.body.limit) : 100;
      const summary = await UserService.resendOpenActivationsBatch(limit);
      return BaseResponse.success(res, "Open activation resend batch completed", summary, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Get current activation resend schedule config.
   */
  static async getActivationSchedule(req, res, next) {
    try {
      const schedule = resendActivationCron.getScheduleConfig();
      return BaseResponse.success(res, "Activation resend schedule loaded", schedule, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * JSON: Update activation resend schedule config (in-memory).
   */
  static async updateActivationSchedule(req, res, next) {
    try {
      const body = req.body || {};
      const partial = {};
      if (typeof body.enabled === "boolean") partial.enabled = body.enabled;
      if (body.batchSize !== undefined) partial.batchSize = Number(body.batchSize);
      if (body.maxIterations !== undefined) partial.maxIterations = Number(body.maxIterations);
      if (body.delayMsBetweenIterations !== undefined) partial.delayMsBetweenIterations = Number(body.delayMsBetweenIterations);

      resendActivationCron.setScheduleConfig(partial);
      const updated = resendActivationCron.getScheduleConfig();
      await resendActivationCron.saveScheduleConfigToDb();
      return BaseResponse.success(res, "Activation resend schedule updated", updated, 200);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  /**
   * Manually trigger resend activation emails (for admin use)
   */
  static async manualResendActivations(req, res, next) {
    try {
      console.log("🔄 Manual resend activation triggered by admin");
      await resendActivationCron.manualResend();
      return BaseResponse.success(res, "Manual resend activation process completed successfully");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }
}

export default UserController;
