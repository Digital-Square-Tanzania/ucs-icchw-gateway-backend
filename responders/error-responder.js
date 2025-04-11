import CustomErrorLogger from "../utils/custom-error-logger.js";
import CustomError from "../utils/custom-error.js";
import ApiError from "../utils/api-error.js";

class ErrorHelper {
  errorLogger;

  constructor() {
    this.errorLogger = new CustomErrorLogger();
  }

  /**
   * Global error handler
   * @param {Error} err - The error object.
   * @param {Object} req - The Express request object.
   * @param {Object} res - The Express response object.
   * @param {Function} next - The next middleware function.
   */
  async handleError(err, req, res, next) {
    try {
      await this.errorLogger.logError(err);

      let statusCode = 500;
      let message = "Internal Server Error";
      let details = null;
      let code = 0;

      if (err.isJoi) {
        statusCode = 400;
        message = "Validation Error";
        details = err.details.map((detail) => ({
          field: detail.context.key,
          message: detail.message,
        }));
      } else if (err.errors && Array.isArray(err.errors)) {
        statusCode = 400;
        message = "Validation Error";
        details = err.errors.map((error) => ({
          field: error.param,
          message: error.msg,
        }));
      } else if (err instanceof ApiError) {
        statusCode = err.statusCode || 500;
        message = err.message || "API error occurred";
        code = err.customCode || 0;
      } else if (err instanceof CustomError) {
        statusCode = err.statusCode || 500;
        message = err.message || "An error occurred";
      } else {
        message = err.message || message;
      }

      // 🔀 Decide which format to respond with
      if (err instanceof ApiError) {
        return res.status(statusCode).json({
          status: "fail",
          message,
          code,
        });
      }

      // 👇 Internal (frontend/backend) format
      const payload = {
        authenticated: !!req.user,
        message,
        details,
      };

      return res.status(statusCode).json({
        success: false,
        request: req.path,
        payload,
      });
    } catch (internalError) {
      console.error("Error in ErrorHandler:", internalError);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while handling another error.",
      });
    }
  }
}

export default ErrorHelper;
