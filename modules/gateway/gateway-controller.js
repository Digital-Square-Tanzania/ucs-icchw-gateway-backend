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
      return GatewayHelper.success(req, res, monthlyStatuses, 1, 200, req.signature);
    } catch (error) {
      return GatewayHelper.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  /**
   * Register new CHW from HRHIS
   */
  static async registerChwFromHrhis(req, res, next) {
    try {
      const response = await GatewayService.registerChwFromHrhis(req, res, next);
      return GatewayHelper.success(req, res, response, 1, 201, req.signature);
    } catch (error) {
      return GatewayHelper.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  /*
   * Change CHW demographics from HRHIS
   */
  static async updateChwDemographics(req, res, next) {
    try {
      const response = await GatewayService.updateChwDemographics(req, res, next);
      return GatewayHelper.success(req, res, response, 1, 200, req.signature);
    } catch (error) {
      return GatewayHelper.error(req, res, error.message, 3, error.statusCode, null);
    }
  }

  /*
   * Change CHW duty station
   */
  static async changeChwDutyStation(req, res, next) {
    try {
      const response = await GatewayService.changeChwDutyStation(req, res, next);
      return GatewayHelper.success(req, res, response, 1, 200);
    } catch (error) {
      return GatewayHelper.error(req, res, error.message, error.customCode || 3, error.statusCode);
    }
  }
}

export default GatewayController;
