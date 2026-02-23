import GatewayService from "../modules/gateway/gateway-service.js";
import ApiLogger from "../utils/api-logger.js";

class GatewayHelper {
  static async send(req, res, responseObject, statusCode) {
    const body = {
      message: responseObject,
      signature: req?.signature ?? null,
    };
    if (req) {
      await ApiLogger.log(req, { statusCode, body });
    }
    return res.status(statusCode).json(body);
  }

  static async success(req, res, message = "null", code = 1, statusCode = 200) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      code: code,
      status: "success",
      message: message,
    };
    return await this.send(req, res, responseObject, statusCode);
  }

  static async error(req, res, message, code = 3, statusCode = 500) {
    const resolvedStatus = statusCode ?? 500;
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      code: code,
      status: "fail",
      message: message,
    };
    return await this.send(req, res, responseObject, resolvedStatus);
  }
}

export default GatewayHelper;
