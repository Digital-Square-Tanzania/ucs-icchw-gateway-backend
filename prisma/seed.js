import RoleSeeder from "./seeds/role-seeder.js";
import UserSeeder from "./seeds/user-seeder.js";
import RawFileSeeder from "./seeds/raw-file-seeder.js";
import MaterializedViewSeeder from "./seeds/materialized-view-seeder.js";
import urlSyncSeeder from "./seeds/url-sync-seeder.js";

async function main() {
  console.log("🌱 Running database seeders...");

  // Run Role Seeder
  await RoleSeeder.seed();

  // Run User Seeder
  await UserSeeder.seed();

  // Run Location Seeder
  const rawFileSeeder = new RawFileSeeder();

  // Seed the materialized view, make it anyway
  await rawFileSeeder.seedFromFile("Location Hierarchy View", "./prisma/seeds/sql/location-hierarchy-view.sql");

  // Refresh the materialized view
  await MaterializedViewSeeder.refreshLocationHierarchyView();

  // Run URL Sync Seeder
  await urlSyncSeeder.seedAll();

  console.log("✅ Seeding completed!");
}

main().catch((error) => {
  console.error("❌ Seeding error:", error);
});
