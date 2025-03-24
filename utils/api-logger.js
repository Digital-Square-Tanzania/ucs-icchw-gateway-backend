import CustomError from "./custom-error.js";
import prisma from "../config/prisma.js";
import { log } from "winston";

class ApiLogger {
  static async logApi(req, res, next) {
    try {
      const { method, url, body, query, params, headers } = req;

      const request = {
        method,
        url,
        body,
        query,
        params,
        headers,
      };

      const response = {
        status: res.statusCode,
        body: res.body,
      };

      await prisma.apiLogger.create({
        data: {
          request,
          response,
        },
      });

      next();
    } catch (error) {
      log.error("Failed to log request:", error.message);
      next(new CustomError("Failed to log request.", 500));
    }
  }
}

export default ApiLogger;
