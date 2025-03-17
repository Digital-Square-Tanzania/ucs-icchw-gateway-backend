import prisma from "../../config/prisma.js";
import { RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { UserStatus } from "@prisma/client";

class UserSeeder {
  static async seed() {
    try {
      console.log("🌱 Seeding users...");

      // Get passwords from environment variables
      const ucsDeveloperPassword = process.env.UCS_DEVELOPER_PASSWORD;
      const mohAdminPassword = process.env.MOH_ADMIN_PASSWORD;
      const councilCoordinatorPassword = process.env.COUNCIL_COORDINATOR_PASSWORD;
      const externalSystemPassword = process.env.EXTERNAL_SYSTEM_PASSWORD;
      const envPasswords = [ucsDeveloperPassword, mohAdminPassword, councilCoordinatorPassword];
      if (envPasswords.some((pwd) => !pwd)) {
        throw new Error("❌ Missing one or more required passwords in environment variables.");
      }

      // Get emails from env variables
      const ucsDeveloperEmail = process.env.UCS_DEVELOPER_EMAIL;
      const mohAdminEmail = process.env.MOH_ADMIN_EMAIL;
      const councilCoordinatorEmail = process.env.COUNCIL_COORDINATOR_EMAIL;
      const externalSystemEmail = process.env.EXTERNAL_SYSTEM_EMAIL;

      const envEmails = [ucsDeveloperEmail, mohAdminEmail, councilCoordinatorEmail, externalSystemEmail];
      if (envEmails.some((email) => !email)) {
        throw new Error("❌ Missing one or more required emails in environment variables.");
      }

      // Hash the passwords
      const saltRounds = 10;
      const hashedSystemDevPassword = await bcrypt.hash(ucsDeveloperPassword, saltRounds);
      const hashedMohAdminPassword = await bcrypt.hash(mohAdminPassword, saltRounds);
      const hashedCouncilCoordinatorPassword = await bcrypt.hash(councilCoordinatorPassword, saltRounds);
      const hashedExternalSystemPassword = await bcrypt.hash(externalSystemPassword, saltRounds);

      // Get role IDs dynamically
      const ucsDevRole = await prisma.role.findUnique({ where: { name: RoleType.UCS_DEVELOPER } });
      const mohAdminRole = await prisma.role.findUnique({ where: { name: RoleType.MOH_ADMIN } });
      const councilCoordinatorRole = await prisma.role.findUnique({ where: { name: RoleType.COUNCIL_COORDINATOR } });
      const externalSystemRole = await prisma.role.findUnique({ where: { name: RoleType.EXTERNAL_SYSTEM } });

      const roles = [ucsDevRole, mohAdminRole, councilCoordinatorRole, externalSystemRole];
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
          firstName: "External",
          middleName: "System",
          lastName: "User",
          email: externalSystemEmail,
          password: hashedExternalSystemPassword,
          roleId: externalSystemRole.id,
          status: UserStatus.ACTIVE,
          joinDate: new Date(),
          phoneNumber: "+255735437887",
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
