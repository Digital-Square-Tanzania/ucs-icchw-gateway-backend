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
}

export default DHIS2Repository;
