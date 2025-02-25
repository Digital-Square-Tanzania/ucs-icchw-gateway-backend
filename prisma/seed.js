import RoleSeeder from "./seeds/role-seeder.js";
import UserSeeder from "./seeds/user-seeder.js";
import RawFileSeeder from "./seeds/raw-file-seeder.js";
import MaterializedViewSeeder from "./seeds/materialized-view-seeder.js";

async function main() {
  console.log("🌱 Running database seeders...");

  // Run Role Seeder
  await RoleSeeder.seed();

  // Run User Seeder
  await UserSeeder.seed();

  // Run Location Seeder
  const rawFileSeeder = new RawFileSeeder();

  // Seeding location
  await rawFileSeeder.seedFromFile("Location", "./prisma/seeds/sql/location-seed.sql");

  // Seeding location_tag
  await rawFileSeeder.seedFromFile("Location Tag", "./prisma/seeds/sql/location-tag-seed.sql");

  // Seeding location_tag_map
  await rawFileSeeder.seedFromFile("Location Tag Map", "./prisma/seeds/sql/location-tag-map-seed.sql");

  // Seed the materialized view, make it anyway
  await rawFileSeeder.seedFromFile("Location Hierarchy View", "./prisma/seeds/sql/location-hierarchy-view.sql");

  // Refresh the materialized view
  await MaterializedViewSeeder.refreshLocationHierarchyView();

  console.log("✅ Seeding completed!");
}

main().catch((error) => {
  console.error("❌ Seeding error:", error);
});
