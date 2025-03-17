import DashboardRepository from "./dashboard-repository.js";
import CustomError from "../../utils/custom-error.js";

class DashboardService {
  /**
   * Get all dashboard statistics
   */
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
}

export default DashboardService;
