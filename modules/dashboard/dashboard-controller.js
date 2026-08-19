import DashboardService from "./dashboard-service.js";
import BaseResponse from "../../responders/base-responder.js";

class DashboardController {
  /**
   * Fetch dashboard statistics
   */
  static async getDashboardStats(req, res, next) {
    try {
      const stats = await DashboardService.getDashboardStats();
      return BaseResponse.success(res, "Dashboard statistics retrieved successfully", stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync dashboard data
   */
  static async syncDashboard(req, res, next) {
    try {
      const { path } = req.body;

      if (!path) {
        return res.status(400).json({
          status: "error",
          message: "Missing 'path' in request body",
        });
      }

      const result = await DashboardService.syncDashboard(path);
      console.log(`✅ Sync complete for ${path}`);
      return BaseResponse.success(res, `Sync for ${path} completed`, { synced: true, path, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * HRHIS register incoming vs successful creates (and updates) over time
   */
  static async getHrhisRegisterTimeseries(req, res, next) {
    try {
      const data = await DashboardService.getHrhisRegisterTimeseries(req.query.days);
      return BaseResponse.success(res, "HRHIS register timeseries retrieved successfully", data);
    } catch (error) {
      next(error);
    }
  }
}

export default DashboardController;
