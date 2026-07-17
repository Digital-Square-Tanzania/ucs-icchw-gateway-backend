import GatewayService from "./gateway-service.js";
import HrhisLocationRecoveryService from "./hrhis-location-recovery-service.js";
import GatewayResponder from "../../responders/gateway-responder.js";
import FfarsResponder from "../../responders/ffars-responder.js";
import CustomError from "../../utils/custom-error.js";
import BaseResponse from "../../responders/base-responder.js";

class GatewayController {
  // Fetch CHW monthly activity statistics
  static async checkChwMonthlyStatus(req, res, next) {
    try {
      const monthlyStatuses = await GatewayService.getChwMonthlyStatus(req, res, next);
      return FfarsResponder.success(req, res, monthlyStatuses, 1, 200, req.signature);
    } catch (error) {
      return FfarsResponder.error(req, res, error.message, error.customCode || 3, error.statusCode || 500);
    }
  }

  // Register new CHW from HRHIS
  static async registerChwFromHrhis(req, res, next) {
    try {
      const response = await GatewayService.registerChwFromHrhis(req, res, next);
      const statusCode = response?.created === false ? 200 : 201;
      const message = typeof response === "object" && response?.message ? response.message : response;
      return GatewayResponder.success(req, res, message, 1, statusCode, req.signature);
    } catch (error) {
      return GatewayResponder.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  // Change CHW demographics from HRHIS
  static async updateChwDemographics(req, res, next) {
    try {
      const response = await GatewayService.updateChwDemographics(req, res, next);
      return GatewayResponder.success(req, res, response, 1, 200, req.signature);
    } catch (error) {
      return GatewayResponder.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  // Change CHW duty station
  static async changeChwDutyStation(req, res, next) {
    try {
      const response = await GatewayService.changeChwDutyStation(req, res, next);
      return GatewayResponder.success(req, res, response, 1, 200);
    } catch (error) {
      return GatewayResponder.error(req, res, error.message, error.customCode || 3, error.statusCode);
    }
  }

  // Test Message Signing
  static async testSignature(req, res, next) {
    try {
      const { message, signature } = req.body;
      if (!message || !message.header || !message.body) {
        throw new CustomError("Both message body and header are required for signing.", 400);
      }
      if (!signature) {
        throw new CustomError("Signature is required for verification.", 400);
      }
      const result = await GatewayService.testSignature(message.body, message.header, signature);
      return BaseResponse.success(res, "Signature testing results", { isWorking: result });
    } catch (error) {
      next(error);
    }
  }

  // Verify Message From FFARS
  static async verifyMessageFromFfars(req, res, next) {
    try {
      const { message, signature } = req.body;
      if (!message || !message.header || !message.body) {
        throw new CustomError("Both message body and header are required for verification.", 400);
      }
      if (!signature) {
        throw new CustomError("Signature is required for verification.", 400);
      }
      const result = await GatewayService.verifyMessageFromFfars(message, signature);
      return BaseResponse.success(res, "Signature verification result", { isVerified: result });
    } catch (error) {
      next(error);
    }
  }

  // Verify Message From UCS
  static async verifyMessageFromUcs(req, res, next) {
    try {
      const { message, signature } = req.body;
      if (!message || !message.header || !message.body) {
        throw new CustomError("Both message body and header are required for verification.", 400);
      }
      if (!signature) {
        throw new CustomError("Signature is required for verification.", 400);
      }
      const result = await GatewayService.verifyMessageFromUcs(message, signature);
      return BaseResponse.success(res, "Signature verification result", { isVerified: result });
    } catch (error) {
      next(error);
    }
  }

  // Sign Message
  static async signMessage(req, res, next) {
    try {
      const { message } = req.body;
      if (!message || !message.header || !message.body) {
        throw new CustomError("Both message body and header are required for signing.", 400);
      }
      const signature = await GatewayService.signMessage(message);
      return BaseResponse.success(res, "Message signed successfully", { signature });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scan api_logs for location-related /chw/register failures in a council.
   * Query: region, district, council, days (optional, default 90).
   */
  static async scanHrhisLocationFailures(req, res, next) {
    try {
      const { region, district, council, days } = req.query;
      const data = await HrhisLocationRecoveryService.scanLocationFailures({
        region,
        district,
        council,
        days,
      });
      return BaseResponse.success(
        res,
        `Found ${data.count} recoverable location failure(s) for ${data.council}.`,
        data
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reprocess stored location-failure register payloads for a council.
   * Body: { region, district, council, logIds?, days?, async? }
   * Bulk recoveries (more than one log, or async:true) run in the background and
   * stream progress over WebSocket to avoid proxy 504 timeouts.
   */
  static async recoverHrhisLocationFailures(req, res, next) {
    try {
      const { region, district, council, logIds, days, async: asyncFlag } = req.body || {};
      const ids = Array.isArray(logIds) ? logIds : [];
      const runAsync = asyncFlag === true || asyncFlag === "true" || ids.length !== 1;

      if (runAsync) {
        const started = HrhisLocationRecoveryService.startRecoverLocationFailuresAsync({
          region,
          district,
          council,
          logIds: ids.length ? ids : undefined,
          days,
        });
        return BaseResponse.success(
          res,
          "HRHIS location recovery started. Progress will be sent over WebSocket.",
          started,
          202
        );
      }

      const data = await HrhisLocationRecoveryService.recoverLocationFailures({
        region,
        district,
        council,
        logIds: ids,
        days,
      });
      return BaseResponse.success(
        res,
        `Recovery finished: ${data.recovered} recovered, ${data.stillFailed} still failed, ${data.skipped} skipped.`,
        data
      );
    } catch (error) {
      next(error);
    }
  }
}

export default GatewayController;
