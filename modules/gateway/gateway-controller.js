import ApiError from "../../utils/api-error.js";
import GatewayService from "./gateway-service.js";
import GatewayHelper from "../../helpers/gateway-helper.js";

class GatewayController {
  /**
   * Fetch CHW monthly activity statistics
   */
  static async checkChwMonthlyStatus(req, res, next) {
    try {
      const monthlyStatuses = await GatewayService.getChwMonthlyStatus(req, res, next);
      return GatewayHelper.success(res, monthlyStatuses, 1, 200);
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
      return GatewayHelper.success(res, response, 1, 201);
    } catch (error) {
      throw new ApiError(error.message, error.statusCode, 3);
    }
  }
}

export default GatewayController;
