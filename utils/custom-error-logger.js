import winston from "winston";
import fs from "fs";
import path from "path";

/*
 * @description Custom logger class to log errors and info messages.
 * @class CustomErrorLogger
 */
class CustomErrorLogger {
  infoLogger;
  errorLogger;

  constructor() {
    // Ensure logs directory exists
    const logDir = "logs";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    // Define the log format for Winston logger instance (info and error)
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${stack ? "\nStack: " + stack : ""}`;
      })
    );

    // Info Logger
    this.infoLogger = winston.createLogger({
      level: "info",
      format: logFormat,
      transports: [
        new winston.transports.Console({ level: "info" }), // Console output
        new winston.transports.File({ filename: path.join(logDir, "app.log"), level: "info" }), // Info log file
      ],
    });

    // Error Logger
    this.errorLogger = winston.createLogger({
      level: "error",
      format: logFormat,
      transports: [
        new winston.transports.Console({ level: "error" }), // Console output
        new winston.transports.File({ filename: path.join(logDir, "error.log"), level: "error" }), // Error log file
      ],
    });
  }

  /*
   * @param {Error} err - Error object.
   * @description Log error details.
   * @returns {Promise<void>}
   * @memberof CustomErrorLogger
   */
  async logError(err) {
    const errorDetails = {
      message: err.message,
      name: err.name,
      statusCode: err.statusCode || 500,
      stack: err.stack,
    };

    this.errorLogger.error(JSON.stringify(errorDetails, null, 2));
  }

  async logInfo(info) {
    this.infoLogger.info(info);
  }
}

export default CustomErrorLogger;
