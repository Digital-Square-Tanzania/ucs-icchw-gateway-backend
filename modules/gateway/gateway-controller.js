import CustomError from "../../utils/custom-error.js";
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
      console.log("ERROR STATUS", error.statusCode);
      throw new CustomError(error.message, error.statusCode);
    }
  }
}

export default GatewayController;
