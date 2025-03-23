import ApiError from "../../utils/api-error.js";
import GatewayService from "./gateway-service.js";

class GatewayController {
  /**
   * Fetch CHW monthly activity statistics
   */
  static async checkChwMonthlyStatus(req, res, next) {
    try {
      const monthlyStatuses = await GatewayService.getChwMonthlyStatus(req, res, next);
      res.status(200).json(monthlyStatuses);
    } catch (error) {
      throw new ApiError(error.message, error.statusCode);
    }
  }

  /**
   * Register new CHW from HRHIS
   */
  static async registerChwFromHrhis(req, res, next) {
    try {
      const response = await GatewayService.registerChwFromHrhis(req, res, next);
      res.status(201).json(response);
    } catch (error) {
      throw new ApiError(error.message, error.statusCode);
    }
  }
}

export default GatewayController;
