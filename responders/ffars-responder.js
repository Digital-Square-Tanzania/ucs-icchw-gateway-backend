import GatewayService from "../modules/gateway/gateway-service.js";
import { FfarsSignature } from "../utils/ffars-signature.js";
import ApiLogger from "../utils/api-logger.js";

class FfarsHelper {
  static async send(req, res, responseObject, statusCode) {
    const ffarsSignature = new FfarsSignature();
    const signature = ffarsSignature.signMessage(responseObject);
    const body = {
      message: responseObject,
      signature: signature,
    };
    if (req) {
      await ApiLogger.log(req, { statusCode, body });
    }
    return res.status(statusCode).json(body);
  }

  static async success(req, res, message = "null", code = 1, statusCode = 200) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = message;
    return this.send(req, res, responseObject, statusCode);
  }

  static async error(req, res, message, code = 3, statusCode = 500) {
    const resolvedStatus = statusCode ?? 500;
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      error: {
        message,
        code,
        statusCode: resolvedStatus,
      },
    };
    return await this.send(req, res, responseObject, resolvedStatus);
  }
}

export default FfarsHelper;
