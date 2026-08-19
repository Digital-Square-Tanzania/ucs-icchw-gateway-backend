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

  /**
   * Mark an api_log row as administratively resolved for duplicate handling.
   * Preserves the original envelope for audit; does not delete rows.
   */
  static async annotateDuplicateResolution(
    logId,
    {
      action,
      resolvedByUserId,
      resolvedByEmail,
      note,
      mergedFields,
      resolutionLogId,
      resolutionLogUuid,
    } = {}
  ) {
    try {
      const id = Number(logId);
      if (!Number.isFinite(id)) return null;

      const existing = await prisma.apiLog.findUnique({ where: { id } });
      if (!existing) return null;

      const response =
        existing.response && typeof existing.response === "object" && !Array.isArray(existing.response)
          ? { ...existing.response }
          : { previous: existing.response };

      response.resolvedAt = new Date().toISOString();
      response.resolutionStatus = action;
      response.resolution = {
        action,
        resolvedByUserId: resolvedByUserId ?? null,
        resolvedByEmail: resolvedByEmail ?? null,
        note: note ?? null,
        mergedFields: Array.isArray(mergedFields) ? mergedFields : [],
        resolutionLogId: resolutionLogId ?? null,
        resolutionLogUuid: resolutionLogUuid ?? null,
      };

      return await prisma.apiLog.update({
        where: { id },
        data: { response },
      });
    } catch (err) {
      console.error(`❌ Failed to annotate duplicate resolution on api_log ${logId}:`, err.message);
      return null;
    }
  }
}

export default ApiLogger;
