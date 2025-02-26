import prisma from "../../config/prisma.js";
import fs from "fs";
import path from "path";

class RawFileSeeder {
  constructor() {
    this.prisma = prisma;
  }

  // Method to read and execute SQL from file
  async seedFromFile(entityName, filePath) {
    try {
      console.log(`🌱 Seeding ${entityName} from SQL file...`);

      // Resolve the absolute path relative to the project root
      const sqlFilePath = path.resolve(filePath);
      const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

      // Split the SQL content into individual statements
      const sqlStatements = sqlContent
        .split(/;\s*$/gm) // Split by semicolon at the end of the line
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0); // Filter out empty statements

      // Execute each SQL statement separately
      for (const statement of sqlStatements) {
        console.log(`🔸 Executing: ${statement.substring(0, 50)}...`);
        await this.prisma.$executeRawUnsafe(statement);
      }

      console.log(`✅ ${entityName} seeded successfully from SQL file.`);
    } catch (error) {
      console.error(`❌ Error during ${entityName} seeding:`, error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

export default RawFileSeeder;
