import GatewayService from "../modules/gateway/gateway-service.js";
import { FfarsSignature } from "../utils/ffars-signature.js";

class FfarsHelper {
  static async send(_req, res, responseObject, statusCode) {
    const ffarsSignature = new FfarsSignature();
    const signature = ffarsSignature.signMessage(responseObject);
    return res.status(statusCode).json({
      message: responseObject,
      signature: signature,
    });
  }

  static async success(req, res, message = "null", code = 1, statusCode = 200) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = message;
    return this.send(req, res, responseObject, statusCode);
  }

  static async error(req, res, message, code = 3, statusCode = 500) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      error: {
        message,
        code,
        statusCode,
      },
    };
    return this.send(req, res, responseObject, statusCode);
  }
}

export default FfarsHelper;
