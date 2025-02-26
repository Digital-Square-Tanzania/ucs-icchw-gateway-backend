import prisma from "../../config/prisma.js";
import fs from "fs";
import path from "path";

class LocationSeeder {
  constructor() {
    this.prisma = prisma;
  }

  // Method to read and execute SQL from file
  async seedFromFile(filePath) {
    try {
      console.log("🌱 Seeding Location from SQL file...");

      // Resolve the absolute path relative to the project root
      const sqlFilePath = path.resolve(filePath);
      const sql = fs.readFileSync(sqlFilePath, "utf8");

      // Execute raw SQL
      await this.prisma.$executeRawUnsafe(sql);

      console.log("✅ Location seeded from SQL file.");
    } catch (error) {
      console.error("❌ Error during seeding:", error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

export default LocationSeeder;
