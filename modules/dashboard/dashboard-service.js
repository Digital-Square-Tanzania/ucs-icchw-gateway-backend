import DashboardRepository from "./dashboard-repository.js";
import FfarsAnalyticsRepository from "./ffars-analytics-repository.js";
import { parseFfarsAnalyticsRange } from "../../utils/ffars-analytics-range.js";
import CustomError from "../../utils/custom-error.js";
import WebSocketService from "../../utils/websocket-service.js";
import DHIS2UserService from "../dhis2/user/dhis2-user-service.js";
import OpenMRSLocationService from "../openmrs/location/openmrs-location-service.js";
import HrhisLocationRecoveryService from "../gateway/hrhis-location-recovery-service.js";

class DashboardService {
  // Get all dashboard statistics
  static async getDashboardStats() {
    try {
      const [openMRSUsers, dhis2Users, ucsTeams, teamMembersStats, villages, facilities, userRegistrations, last7Users, teamMembersByZone, teamsByZone, teamSizeDistribution] = await Promise.all([
        DashboardRepository.getOpenMRSUsersCount(),
        DashboardRepository.getDHIS2UsersCount(),
        DashboardRepository.getUCSTeamsCount(),
        DashboardRepository.getTeamMembersStats(),
        DashboardRepository.getVillagesCount(),
        DashboardRepository.getFacilitiesCount(),
        DashboardRepository.getUserRegistrationsPerMonth(),
        DashboardRepository.getLast7OpenMRSUsers(),
        DashboardRepository.getTeamMembersByZone(),
        DashboardRepository.getTeamsByZone(),
        DashboardRepository.getTeamSizeDistribution(),
      ]);

      return {
        openMRSUsers,
        dhis2Users,
        ucsTeams,
        teamMembers: teamMembersStats,
        villages,
        facilities,
        userRegistrations,
        last7Users,
        teamMembersByZone,
        teamsByZone,
        teamSizeDistribution,
      };
    } catch (error) {
      console.error("❌ Error fetching dashboard stats:", error.message);
      throw new CustomError("Failed to fetch dashboard statistics." + error.message, 400);
    }
  }

  static publish(path, event) {
    WebSocketService.broadcast({
      ...event,
      path,
      timestamp: new Date().toISOString(),
    });
  }

  // Sync dashboard data (MOH_ADMIN and UCS_DEVELOPER roles)
  static async syncDashboard(path) {
    switch (path) {
      case "dhis2":
        return this.syncDhis2Users();
      case "openmrs":
        return this.syncDhis2Users();
      case "villages":
        return this.syncVillages();
      case "facilities":
        return this.syncFacilities();
      default:
        throw new Error(`Unknown sync path: ${path}`);
    }
  }

  // Sync DHIS2 users
  static async syncDhis2Users() {
    const path = "dhis2";
    try {
      DashboardService.publish(path, {
        type: "sync-progress",
        message: "Syncing DHIS2 users…",
        percent: 10,
        log: true,
        level: "info",
      });
      await DHIS2UserService.syncUsers();
      DashboardService.publish(path, {
        type: "sync-complete",
        status: "complete",
        synced: true,
        percent: 100,
        message: "DHIS2 user sync completed.",
        level: "success",
      });
      return { synced: true };
    } catch (error) {
      DashboardService.publish(path, {
        type: "sync-error",
        status: "error",
        message: error.message || "DHIS2 user sync failed.",
        level: "error",
        log: true,
      });
      throw error;
    }
  }

  static async syncLocationPath(path) {
    try {
      const result = await OpenMRSLocationService.syncLocations(1000, (progress) => {
        DashboardService.publish(path, { type: "sync-progress", ...progress });
      });
      const count = Number(result?.synced) || 0;
      DashboardService.publish(path, {
        type: "sync-complete",
        status: "complete",
        synced: true,
        count,
        percent: 100,
        level: "success",
        message: `Sync completed: ${count.toLocaleString()} location(s) synced.`,
      });
      return { synced: true, count };
    } catch (error) {
      DashboardService.publish(path, {
        type: "sync-error",
        status: "error",
        message: error.message || "OpenMRS location sync failed.",
        level: "error",
        log: true,
      });
      throw error;
    }
  }

  // Sync Villages
  static async syncVillages() {
    return this.syncLocationPath("villages");
  }

  // Sync Facilities (OpenMRS location sync from Settings > Maintenance)
  static async syncFacilities() {
    return this.syncLocationPath("facilities");
  }

  static async getHrhisRegisterTimeseries(days, scope = {}) {
    try {
      let councilPrefixes = null;
      if (scope?.council) {
        councilPrefixes = await HrhisLocationRecoveryService.resolveCouncilPrefixes(
          scope.region,
          scope.district,
          scope.council
        );
      }
      return await DashboardRepository.getHrhisRegisterTimeseries(days, councilPrefixes);
    } catch (error) {
      console.error("❌ Error fetching HRHIS register timeseries:", error.message);
      throw new CustomError("Failed to fetch HRHIS register timeseries. " + error.message, 400);
    }
  }

  static async getFfarsEligibilityTimeseries(query = {}, scope = {}) {
    try {
      const range = parseFfarsAnalyticsRange(query);
      let councilPrefixes = null;
      if (scope?.council) {
        councilPrefixes = await HrhisLocationRecoveryService.resolveCouncilPrefixes(
          scope.region,
          scope.district,
          scope.council,
        );
      }
      return await FfarsAnalyticsRepository.getTimeseries(range, councilPrefixes);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      const missing = error?.code === "42P01" || /partner_api_calls/.test(String(error?.message || ""));
      console.error("❌ Error fetching FFARS eligibility timeseries:", error.message);
      if (missing) {
        throw new CustomError(
          "FFARS request table is missing. Run the latest migration, then the partner-call backfill.",
          400,
        );
      }
      throw new CustomError("Failed to fetch FFARS eligibility timeseries. " + error.message, 400);
    }
  }
}

export default DashboardService;
