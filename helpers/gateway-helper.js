import GatewayService from "../modules/gateway/gateway-service.js";

class GatewayHelper {
  static send(res, message, statusCode, signature) {
    return res.status(statusCode).json({
      message: message,
      signature: signature,
    });
  }

  static async success(req, res, message = "null", code = 1, statusCode = 200, signature) {
    const message = await GatewayService.generateHrhisReponseParts(req);
    message.body = {
      code: code,
      status: "success",
      message: message,
    };
    return this.send(res, message, statusCode, signature);
  }

  static async error(req, res, message, code = 3, statusCode = 500, signature) {
    const message = await GatewayService.generateHrhisReponseParts(req);
    message.body = {
      code: code,
      status: "fail",
      message: message,
    };
    return this.send(res, responseObject, statusCode, signature);
  }
}

export default GatewayHelper;
