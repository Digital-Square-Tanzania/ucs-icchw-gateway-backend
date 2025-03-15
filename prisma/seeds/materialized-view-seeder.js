import prisma from "../../config/prisma.js";

class MaterializedViewSeeder {
  static async refreshLocationHierarchyView() {
    try {
      console.log("🔄 Refreshing location_hierarchy_view...");

      // Refresh the materialized view
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW public.openmrs_location_hierarchy_view`;

      console.log("✅ location_hierarchy_view refreshed successfully.");
    } catch (error) {
      console.error("❌ Error refreshing materialized view:", error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

export default MaterializedViewSeeder;
