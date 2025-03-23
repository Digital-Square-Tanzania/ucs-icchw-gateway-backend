class GatewayHelper {
  static send(res, statusCode, status, message, code) {
    return res.status(statusCode).json({
      code,
      status,
      message,
    });
  }

  static success(res, message = "null", code = 1, statusCode = 200) {
    return this.send(res, statusCode, "success", message, code);
  }

  static error(res, message, statusCode = 500, code = 0) {
    return this.send(res, statusCode, "error", message, code);
  }
}

export default GatewayHelper;
