import GatewayService from "../modules/gateway/gateway-service.js";

class GatewayHelper {
  static send(res, responseObject, statusCode) {
    return res.status(statusCode).json({
      message: responseObject,
      signature: req.signature,
    });
  }

  static async success(req, res, message = "null", code = 1, statusCode = 200) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      code: code,
      status: "success",
      message: message,
    };
    return this.send(res, responseObject, statusCode);
  }

  static async error(req, res, message, code = 3, statusCode = 500) {
    const responseObject = await GatewayService.generateHrhisReponseParts(req);
    responseObject.body = {
      code: code,
      status: "fail",
      message: message,
    };
    return this.send(res, responseObject, statusCode);
  }
}

export default GatewayHelper;
