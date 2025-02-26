import dotenv from "dotenv";
import prisma from "../../config/prisma.js";
import TeamRoleService from "../../modules/team/team-role/team-role-service.js";
import TeamService from "../../modules/team/team/team-service.js";

dotenv.config();

class URLSyncSeeder {
  static async seedAll() {
    console.log("🌍 Syncing data from OpenMRS...");

    try {
      console.log("🔄 Syncing Team Roles...");
      await TeamRoleService.fetchTeamRolesFromOpenMRS();
      console.log("✅ Team Roles sync completed.");
    } catch (error) {
      console.error("❌ Error syncing Team Roles:", error.message);
    }

    try {
      console.log("🔄 Syncing Teams...");
      await TeamService.syncTeamsFromOpenMRS();
      console.log("✅ Teams sync completed.");
    } catch (error) {
      console.error("❌ Error syncing Teams:", error.message);
    }

    console.log("✅ OpenMRS sync completed.");
    await prisma.$disconnect();
  }
}

export default URLSyncSeeder;
