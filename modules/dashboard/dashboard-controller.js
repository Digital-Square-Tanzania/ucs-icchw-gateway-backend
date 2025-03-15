import DashboardService from "./dashboard-service.js";
import ResponseHelper from "../../helpers/response-helper.js";

class DashboardController {
  /**
   * Fetch dashboard statistics
   */
  static async getDashboardStats(req, res, next) {
    try {
      const stats = await DashboardService.getDashboardStats();
      return ResponseHelper.success(res, "Dashboard statistics retrieved successfully", stats);
    } catch (error) {
      next(error);
    }
  }
}

export default DashboardController;
