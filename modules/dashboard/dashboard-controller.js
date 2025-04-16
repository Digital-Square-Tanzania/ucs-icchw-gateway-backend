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

      // Kick off async sync task (no await)
      DashboardService.syncDashboard(path)
        .then((result) => {
          // Send WebSocket notification from inside service after completion
          console.log(`✅ Sync complete for ${path}`);
        })
        .catch((error) => {
          console.error(`❌ Sync failed for ${path}:`, error);
        });

      // Immediate response
      return BaseResponse.success(res, `Sync for ${path} started`, { started: true });
    } catch (error) {
      next(error);
    }
  }
}

export default DashboardController;
