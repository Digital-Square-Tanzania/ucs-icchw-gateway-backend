import axios from "axios";
import dotenv from "dotenv";
import TeamRoleRepository from "../../modules/team/team-role/team-role-repository.js";
import CustomError from "../../utils/custom-error.js";
import prisma from "../../config/prisma.js";

dotenv.config();

class URLSyncSeeder {
  constructor() {
    this.syncEndpoints = [
      {
        name: "Team Roles",
        url: process.env.OPENMRS_API_URL + "team/teamrole?v=full",
        auth: {
          username: "admin",
          password: "UcsOpenmrsPassword2023",
        },
        handler: this.syncTeamRoles,
      },
    ];
  }

  async seedAll() {
    console.log("🌍 Syncing data from OpenMRS...");

    for (const endpoint of this.syncEndpoints) {
      try {
        console.log(`🔄 Syncing ${endpoint.name}...`);
        const response = await axios.get(endpoint.url, { auth: endpoint.auth });
        await endpoint.handler(response.data.results);
        console.log(`✅ ${endpoint.name} sync completed.`);
      } catch (error) {
        console.error(`❌ Error syncing ${endpoint.name}:`, "\nMessage\n" + error.message + "\nResponse\n" + error.stack);
      }
    }

    console.log("✅ OpenMRS sync completed.");
    await prisma.$disconnect();
  }

  async syncTeamRoles(teamRoles) {
    try {
      const formattedRoles = teamRoles.map((role) => ({
        uuid: role.uuid,
        identifier: role.identifier,
        display: role.display,
        name: role.name,
        members: role.members,
        creator: role.auditInfo?.creator,
      }));

      await TeamRoleRepository.upsertTeamRoles(formattedRoles);
    } catch (error) {
      throw new CustomError("Failed to sync team roles.", 500);
    }
  }
}

export default new URLSyncSeeder();
