class ResponseHelper {
  static send(res, statusCode, status, message, data = null) {
    return res.status(statusCode).json({
      status,
      message,
      data,
    });
  }

  static success(res, message, data = null, statusCode = 200) {
    return this.send(res, statusCode, "success", message, data);
  }

  static error(res, message, statusCode = 500, data = null) {
    return this.send(res, statusCode, "error", message, data);
  }
}

export default ResponseHelper;
