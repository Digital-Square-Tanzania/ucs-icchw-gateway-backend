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
      next(error);
    }
  }
}

export default GatewayController;
