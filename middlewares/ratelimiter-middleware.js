import rateLimit from "express-rate-limit";
import ResponseHelper from "../helpers/response-helper.js";

class RoleBasedRateLimiter {
  constructor(windowMs = 60 * 60 * 1000) {
    this.windowMs = windowMs; // Default: 1 hour window
  }

  // Method to dynamically set max requests based on user role
  dynamicMaxRequests(req, defaultLimit) {
    try {
      const userRole = req.user?.role;

      // UCS_DEVELOPER gets 10x the rate limit
      if (userRole === "UCS_DEVELOPER") {
        return defaultLimit * 10;
      }

      // Other users use the default limit
      return defaultLimit;
    } catch (err) {
      console.error("Error determining dynamic rate limit:", err);
      return defaultLimit; // Fallback to default
    }
  }

  // Method to create a rate limiter instance
  createLimiter(defaultLimit) {
    return rateLimit({
      windowMs: this.windowMs,
      max: (req, res) => this.dynamicMaxRequests(req, defaultLimit),
      message: (req, res) => {
        return ResponseHelper.error(res, "Too many requests. Please try again later.", 429);
      },
      keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if available, else IP
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
}

// Instantiate Rate Limiter
const rateLimiter = new RoleBasedRateLimiter();

// Export Specific Limiters
export const createUserRateLimiter = rateLimiter.createLimiter(10); // 10 for standard, 100 for UCS_DEVELOPER
export const updateUserRateLimiter = rateLimiter.createLimiter(5);
export const deleteUserRateLimiter = rateLimiter.createLimiter(5);
export const searchUserRateLimiter = rateLimiter.createLimiter(10);

// FIXME: Revert these limiters to 10x less in prod
export const updateChwDemographicsRateLimiter = rateLimiter.createLimiter(20);
export const checkChwMonthlyStatusRateLimiter = rateLimiter.createLimiter(20);
export const registerChwFromHrhisRateLimiter = rateLimiter.createLimiter(500);
export const changeChwDutyStationRateLimiter = rateLimiter.createLimiter(10);

export default RoleBasedRateLimiter;
