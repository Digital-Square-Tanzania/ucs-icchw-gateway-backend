import CustomErrorLogger from "../utils/custom-error-logger.js";
import CustomError from "../utils/custom-error.js";

class ErrorHandler {
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
      // Log the error using the custom logger
      await this.errorLogger.logError(err);

      // Determine error type
      let statusCode = 500;
      let message = "Internal Server Error";
      let details = null;

      // Handle Joi validation errors
      if (err.isJoi) {
        statusCode = 400;
        message = "Validation Error";
        details = err.details.map((detail) => ({
          field: detail.context.key,
          message: detail.message,
        }));
      }
      // Handle express-validator errors (if any)
      else if (err.errors && Array.isArray(err.errors)) {
        statusCode = 400;
        message = "Validation Error";
        details = err.errors.map((error) => ({
          field: error.param,
          message: error.msg,
        }));
      }
      // Handle custom errors
      else if (err instanceof CustomError) {
        statusCode = err.statusCode || 500;
        message = err.message || "An error occurred";
      }
      // Fallback for generic errors
      else {
        message = err.message || message;
      }

      // Create response payload
      const payload = {
        authenticated: req.user ? true : false,
        message,
        details, // Detailed error messages (if any)
        // stack: err.stack, // Stack trace (for debugging)
      };

      // Send the error response
      res.status(statusCode).json({
        success: false,
        request: req.path,
        payload,
      });
    } catch (internalError) {
      // Handle errors that occur within the error handler itself
      console.error("Error in ErrorHandler:", internalError);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred while handling another error.",
      });
    }
  }
}

export default ErrorHandler;
