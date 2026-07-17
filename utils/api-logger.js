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

      next();
    } catch (error) {
      console.error(`Failed to log request: ${error.message}`);
      throw new CustomError("Failed to log request." + error.message, 500);
    }
  }

  static async log(req, resOrPayload) {
    try {
      const safeReq = req || {};
      const { method, url, body, query, params, headers } = safeReq;
      const status = resOrPayload?.statusCode || 200;
      const responseBody = resOrPayload?.body || resOrPayload;

      const request = { method, url, body, query, params, headers };
      const response = { status, body: responseBody };

      return await prisma.apiLog.create({ data: { request, response } });
    } catch (err) {
      console.error(`❌ Failed to log request internally: ${err.message}`);
      return null;
    }
  }

  /**
   * Merge recovery metadata onto an existing failure log without changing its
   * fail status — preserves audit history while marking the row as resolved.
   */
  static async annotateRecovered(logId, { recoveredByLogId, recoveredByLogUuid } = {}) {
    try {
      const id = Number(logId);
      if (!Number.isFinite(id)) return null;

      const existing = await prisma.apiLog.findUnique({ where: { id } });
      if (!existing) return null;

      const response =
        existing.response && typeof existing.response === "object" && !Array.isArray(existing.response)
          ? { ...existing.response }
          : { previous: existing.response };

      response.recoveredAt = new Date().toISOString();
      response.recoveryStatus = "recovered";
      if (recoveredByLogId != null) response.recoveredByLogId = recoveredByLogId;
      if (recoveredByLogUuid) response.recoveredByLogUuid = recoveredByLogUuid;

      return await prisma.apiLog.update({
        where: { id },
        data: { response },
      });
    } catch (err) {
      console.error(`❌ Failed to annotate recovered api_log ${logId}:`, err.message);
      return null;
    }
  }
}

export default ApiLogger;
