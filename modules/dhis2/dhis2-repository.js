import prisma from "../../config/prisma.js";

class DHIS2Repository {
  /**
   * Upsert DHIS2 Org Units
   */
  static async upsertOrgUnits(orgUnits) {
    const formattedUnits = orgUnits.map((unit) => ({
      uuid: unit.id,
      name: unit.displayName,
      level: unit.level,
      latitude: unit.geometry?.coordinates ? parseFloat(unit.geometry.coordinates[1]) : null,
      longitude: unit.geometry?.coordinates ? parseFloat(unit.geometry.coordinates[0]) : null,
      parentUuid: unit.parent?.id || null,
      parentName: unit.parent?.displayName || null,
      parentLevel: unit.parent?.level || null,
    }));

    await prisma.dhis2OrgUnit.createMany({
      data: formattedUnits,
      skipDuplicates: true,
    });
  }

  /**
   * Get All Org Units
   */
  static async getOrgUnits() {
    return await prisma.dhis2OrgUnit.findMany({
      orderBy: { id: "asc" },
    });
  }

  /**
   * Save Sync Log
   */
  static async saveSyncLog(entityType, entityUuid, action, status, details = null) {
    await prisma.dhis2SyncLog.create({
      data: {
        entityType,
        entityUuid,
        action,
        status,
        details,
      },
    });
  }

  /**
   * Get Level 4 Org Units grouped by their Parent Name (Level 3)
   */
  static async getGroupedOrgUnits() {
    const level4Units = await prisma.dhis2OrgUnit.findMany({
      where: { level: 4 },
      select: {
        uuid: true,
        name: true,
        parentUuid: true,
        parentName: true,
      },
      orderBy: { parentName: "asc" }, // Sort by parent name for ordered grouping
    });

    // Grouping the results by parentName (Level 3)
    const groupedOrgUnits = level4Units.reduce((acc, unit) => {
      const parentName = unit.parentName || "Unknown Parent";

      if (!acc[parentName]) {
        acc[parentName] = [];
      }

      acc[parentName].push({
        uuid: unit.uuid,
        name: unit.name,
      });

      return acc;
    }, {});

    return groupedOrgUnits;
  }
}

export default DHIS2Repository;
