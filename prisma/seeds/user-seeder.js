import prisma from "../../config/prisma.js";
import { RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables

import { UserStatus } from "@prisma/client";

class UserSeeder {
  static async seed() {
    try {
      console.log("🌱 Seeding users...");

      // Get passwords from environment variables
      const ucsDeveloperPassword = process.env.UCS_DEVELOPER_PASSWORD;
      const mohAdminPassword = process.env.MOH_ADMIN_PASSWORD;
      const councilCoordinatorPassword = process.env.COUNCIL_COORDINATOR_PASSWORD;
      const facilityProviderPassword = process.env.FACILITY_PROVIDER_PASSWORD;
      const villageChwPassword = process.env.VILLAGE_CHW_PASSWORD;
      const envPasswords = [ucsDeveloperPassword, mohAdminPassword, councilCoordinatorPassword, facilityProviderPassword, villageChwPassword];
      if (envPasswords.some((pwd) => !pwd)) {
        throw new Error("❌ Missing one or more required passwords in environment variables.");
      }

      // Get emails from env variables
      const ucsDeveloperEmail = process.env.UCS_DEVELOPER_EMAIL;
      const mohAdminEmail = process.env.MOH_ADMIN_EMAIL;
      const councilCoordinatorEmail = process.env.COUNCIL_COORDINATOR_EMAIL;
      const facilityProviderEmail = process.env.FACILITY_PROVIDER_EMAIL;
      const villageChwEmail = process.env.VILLAGE_CHW_EMAIL;
      const envEmails = [ucsDeveloperEmail, mohAdminEmail, councilCoordinatorEmail, facilityProviderEmail, villageChwEmail];
      if (envEmails.some((email) => !email)) {
        throw new Error("❌ Missing one or more required emails in environment variables.");
      }

      // Hash the passwords
      const saltRounds = 10;
      const hashedSystemDevPassword = await bcrypt.hash(ucsDeveloperPassword, saltRounds);
      const hashedMohAdminPassword = await bcrypt.hash(mohAdminPassword, saltRounds);
      const hashedCouncilCoordinatorPassword = await bcrypt.hash(councilCoordinatorPassword, saltRounds);
      const hashedFacilityProviderPassword = await bcrypt.hash(facilityProviderPassword, saltRounds);
      const hashedVillageChwPassword = await bcrypt.hash(villageChwPassword, saltRounds);

      // Get role IDs dynamically
      const ucsDevRole = await prisma.role.findUnique({ where: { name: RoleType.UCS_DEVELOPER } });
      const mohAdminRole = await prisma.role.findUnique({ where: { name: RoleType.MOH_ADMIN } });
      const councilCoordinatorRole = await prisma.role.findUnique({ where: { name: RoleType.COUNCIL_COORDINATOR } });
      const facilityProviderRole = await prisma.role.findUnique({ where: { name: RoleType.FACILITY_PROVIDER } });
      const villageChwRole = await prisma.role.findUnique({ where: { name: RoleType.VILLAGE_CHW } });

      const roles = [ucsDevRole, mohAdminRole, councilCoordinatorRole, facilityProviderRole, villageChwRole];
      if (roles.some((role) => !role)) {
        throw new Error("❌ One or more roles not found in the database.");
      }

      // User data
      const users = [
        {
          firstName: "UCS",
          middleName: "Developer",
          lastName: "User",
          email: ucsDeveloperEmail,
          password: hashedSystemDevPassword,
          roleId: ucsDevRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255755437887",
        },
        {
          firstName: "MOH",
          middleName: "Admin",
          lastName: "User",
          email: mohAdminEmail,
          password: hashedMohAdminPassword,
          roleId: mohAdminRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255715437887",
        },
        {
          firstName: "Council",
          middleName: "Coordinator",
          lastName: "User",
          email: councilCoordinatorEmail,
          password: hashedCouncilCoordinatorPassword,
          roleId: councilCoordinatorRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255765437887",
        },
        {
          firstName: "Facility",
          middleName: "Provider",
          lastName: "User",
          email: facilityProviderEmail,
          password: hashedFacilityProviderPassword,
          roleId: facilityProviderRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255775437887",
        },
        {
          firstName: "Village",
          middleName: "CHW",
          lastName: "User",
          email: villageChwEmail,
          password: hashedVillageChwPassword,
          roleId: villageChwRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255785437887",
        },
      ];

      // Insert or update users
      for (const user of users) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        });
      }

      console.log("✅ Users seeded successfully.");
    } catch (error) {
      console.error("❌ Seeding failed:", error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

export default UserSeeder;
