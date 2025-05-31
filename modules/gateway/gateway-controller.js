import GatewayService from "./gateway-service.js";
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
      return FfarsResponder.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  // Register new CHW from HRHIS
  static async registerChwFromHrhis(req, res, next) {
    try {
      const response = await GatewayService.registerChwFromHrhis(req, res, next);
      return GatewayResponder.success(req, res, response, 1, 201, req.signature);
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
}

export default GatewayController;
