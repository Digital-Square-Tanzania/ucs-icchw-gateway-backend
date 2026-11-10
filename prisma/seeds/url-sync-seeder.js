import dotenv from "dotenv";
import prisma from "../../config/prisma.js";
import TeamRoleService from "../../modules/openmrs/team-role/openmrs-team-role-service.js";
import TeamService from "../../modules/openmrs/team/openmrs-team-service.js";
import MemberRoleService from "../../modules/openmrs/member-role/openmrs-member-role-service.js";
import OpenMRSLocationService from "../../modules/openmrs/location/openmrs-location-service.js";
import DHIS2OrgUnitService from "../../modules/dhis2/org-unit/dhis2-org-unit-service.js";
// import TeamMemberService from "../../modules/openmrs/team-member/openmrs-team-member-service.js";

dotenv.config();

class URLSyncSeeder {
  static async seedAll() {
    console.log("🌍 Fast-syncing OpenMRS reference data from MySQL (not REST)...");

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
      console.log("🔄 Syncing Member Roles...");
      await MemberRoleService.syncMemberRolesFromOpenMRS();
      console.log("✅ Member Roles sync completed.");
    } catch (error) {
      console.error("❌ Error during OpenMRS sync:", error.message);
    }

    try {
      console.log("🔄 Syncing Team Members...");
      // await TeamMemberService.syncTeamMembers();
      console.log("✅ Team Members sync completed.");
    } catch (error) {
      console.error("❌ Error syncing Team Members:", error.message);
    }

    try {
      console.log("🔄 Syncing OpenMRS Locations...");
      await OpenMRSLocationService.syncLocations(10000);
      console.log("✅ OpenMRS Locations sync completed.");
    } catch (error) {
      console.error("❌ Error syncing OpenMRS Locations:", error.message);
    }
    try {
      console.log("🔄 Syncing OpenMRS Location Attribute Types...");
      await OpenMRSLocationService.syncLocationAttributeTypes();
      console.log("✅ OpenMRS Locations attribute types sync completed.");
    } catch (error) {
      console.error("❌ Error syncing OpenMRS location attribute types:", error.message);
    }
    if (process.env.SEED_SKIP_DHIS2 === "true" || process.env.SEED_SKIP_DHIS2 === "1") {
      console.log("⏭️  Skipping DHIS2 org unit sync (SEED_SKIP_DHIS2).");
    } else {
      try {
        console.log("🔄 Syncing DHIS2 Org Units...");
        await DHIS2OrgUnitService.syncOrgUnits(1000);
        console.log("✅ DHIS2 Org Units sync completed.");
      } catch (error) {
        console.error("❌ Error syncing DHIS2 Org Units:", error.message);
      }
    }

    console.log("✅ OpenMRS sync completed.");
    await prisma.$disconnect();
  }
}

export default URLSyncSeeder;
