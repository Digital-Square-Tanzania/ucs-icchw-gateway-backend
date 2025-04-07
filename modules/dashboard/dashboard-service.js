import DashboardRepository from "./dashboard-repository.js";
import CustomError from "../../utils/custom-error.js";
import WebSocketService from "../../utils/websocket-service.js";
import DHIS2UserService from "../dhis2/user/dhis2-user-service.js";
import OpenMRSLocationService from "../openmrs/location/openmrs-location-service.js";

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
      throw new CustomError("Failed to fetch dashboard statistics." + error.stack, 400);
    }
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
    await DHIS2UserService.syncUsers();
    WebSocketService.broadcast({
      type: "sync-complete",
      path: "dhis2",
      timestamp: new Date().toISOString(),
    });

    return { synced: true };
  }

  // Sync Villages
  static async syncVillages() {
    await OpenMRSLocationService.syncLocations(1000);
    WebSocketService.broadcast({
      type: "sync-complete",
      path: "villages",
      timestamp: new Date().toISOString(),
    });
    return { synced: true };
  }

  // Sync Facilities
  static async syncFacilities() {
    await OpenMRSLocationService.syncLocations(1000);
    WebSocketService.broadcast({
      type: "sync-complete",
      path: "facilities",
      timestamp: new Date().toISOString(),
    });
    return { synced: true };
  }
}

export default DashboardService;
