import prisma from "../../config/prisma.js"; // Import Prisma client
import { RoleType } from "@prisma/client"; // Import RoleType enum

class RoleSeeder {
  static roles = [
    { name: RoleType.UCS_DEVELOPER, description: "Develops & maintains the system" },
    { name: RoleType.MOH_ADMIN, description: "Manages Ministry of Health data" },
    { name: RoleType.MOH_USER, description: "Views Ministry of Health data" },
    { name: RoleType.COUNCIL_COORDINATOR, description: "Manages council-level health data" },
    { name: RoleType.EXTERNAL_SYSTEM, description: "An external system that integrates with UCS" },
  ];

  static async seed() {
    try {
      console.log("🌱 Seeding roles...");

      for (const role of this.roles) {
        await prisma.role.upsert({
          where: { name: role.name },
          update: {},
          create: role,
        });
      }

      console.log("✅ Roles seeded successfully.");
    } catch (error) {
      console.error("❌ Seeding failed:", error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

export default RoleSeeder;
