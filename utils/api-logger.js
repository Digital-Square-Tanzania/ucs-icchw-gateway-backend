import CustomError from "./custom-error.js";
import prisma from "../config/prisma.js";

class ApiLogger {
  static async logApi(req, res, next) {
    try {
      const { method, url, body, query, params, headers } = req;

      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || // for proxies/load balancers
        req.socket?.remoteAddress ||
        req.ip ||
        "Unknown";

      const request = { method, url, body, query, params, headers, ip };
      const response = { status: res.statusCode, body: res.body };

      await prisma.apiLog.create({ data: { request, response } });
      await prisma.api;

      next();
    } catch (error) {
      logger.error(`Failed to log request: ${error.message}`);
      next(new CustomError("Failed to log request.", 500));
    }
  }

  static async log(req, resOrPayload) {
    try {
      const { method, url, body, query, params, headers } = req;
      const status = resOrPayload?.statusCode || 200;
      const responseBody = resOrPayload?.body || resOrPayload;

      const request = { method, url, body, query, params, headers };
      const response = { status, body: responseBody };

      await prisma.apiLog.create({ data: { request, response } });
    } catch (err) {
      logger.error(`❌ Failed to log request internally: ${err.message}`);
    }
  }
}

export default ApiLogger;
