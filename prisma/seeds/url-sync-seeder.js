import dotenv from "dotenv";
import prisma from "../../config/prisma.js";
import TeamRoleService from "../../modules/team/team-role/team-role-service.js";
import TeamService from "../../modules/team/team/team-service.js";
import UserRoleService from "../../modules/team/user-role/user-role-service.js";
import teamMemberService from "../../modules/team/team-member/team-member-service.js";

dotenv.config();

class URLSyncSeeder {
  static async seedAll() {
    console.log("🌍 Syncing data from OpenMRS...");

    try {
      console.log("🔄 Syncing Team Roles...");
      await TeamRoleService.syncTeamRolesFromOpenMRS();
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

    try {
      console.log("🔄 Syncing User Roles...");
      await UserRoleService.syncUserRolesFromOpenMRS();
      console.log("✅ User Roles sync completed.");
    } catch (error) {
      console.error("❌ Error during OpenMRS sync:", error.message);
    }

    try {
      console.log("🔄 Syncing Team Members...");
      await teamMemberService.syncTeamMembers();
      console.log("✅ Team Members sync completed.");
    } catch (error) {
      console.error("❌ Error syncing Team Members:", error.message + "\nERROR STACK:\n" + error.stack);
    }

    console.log("✅ OpenMRS sync completed.");
    await prisma.$disconnect();
  }
}

export default URLSyncSeeder;
