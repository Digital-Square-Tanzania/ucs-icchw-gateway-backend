import RoleSeeder from "./seeds/role-seeder.js";
import UserSeeder from "./seeds/user-seeder.js";

async function main() {
  console.log("🌱 Running database seeders...");
  await RoleSeeder.seed();
  await UserSeeder.seed();
  console.log("✅ Seeding completed!");
}

main().catch((error) => {
  console.error("❌ Seeding error:", error);
});
