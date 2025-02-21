import CustomErrorLogger from "../utils/custom-error-logger.js";
import CustomError from "../utils/custom-error.js";

class ErrorHandler {
  errorLogger;

  constructor() {
    this.errorLogger = new CustomErrorLogger();
  }

  async handleError(err, req, res, next) {
    try {
      // Log error using the custom logger
      await this.errorLogger.logError(err);

      // Determine if the error is a CustomError or a generic one
      const statusCode = err instanceof CustomError ? err.statusCode : 500;

      // Create response payload
      const payload = {
        authenticated: req.decoded ? true : false,
        message: err.message || "Internal Server Error",
      };

      // Send the error response to the client
      res.status(statusCode).json({
        success: false,
        request: req.path,
        payload: payload,
      });
    } catch (error) {
      console.error("Error in ErrorHandler:", error);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred.",
      });
    }
  }
}

export default ErrorHandler;
