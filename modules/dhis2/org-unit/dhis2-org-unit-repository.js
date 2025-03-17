import prisma from "../../../config/prisma.js";
import CustomError from "../../../utils/custom-error.js";

class DHIS2OrgUnitRepository {
  /**
   * Upsert DHIS2 Org Units
   */
  static async upsertOrgUnits(orgUnits) {
    try {
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

      await prisma.dHIS2OrgUnit.createMany({
        data: formattedUnits,
        skipDuplicates: true,
      });
    } catch (error) {
      throw new CustomError(`Failed to upsert DHIS2 Org Units: ${error.message}`);
    }
  }

  /**
   * Get Org Units with optional search filters
   */
  static async getOrgUnits({ name, level, parentUuid, limit = 500, page = 1 }) {
    try {
      const filters = {};

      if (name) {
        filters.name = { contains: name, mode: "insensitive" }; // Case-insensitive search
      }

      if (level) {
        filters.level = Number(level); // Ensure level is a number
      }

      if (parentUuid) {
        filters.parentUuid = parentUuid;
      }

      const skip = (page - 1) * limit;

      const [orgUnits, totalCount] = await Promise.all([
        prisma.dHIS2OrgUnit.findMany({
          where: filters,
          orderBy: { id: "asc" },
          skip,
          take: Number(limit),
        }),
        prisma.dHIS2OrgUnit.count({ where: filters }),
      ]);

      return {
        orgUnits,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new CustomError(`Failed to fetch DHIS2 Org Units: ${error.message}`);
    }
  }

  /**
   * Save Sync Log
   */
  static async saveSyncLog(entityType, entityUuid, action, status, details = {}) {
    try {
      return await prisma.syncLog.create({
        data: {
          entityType,
          entityUuid,
          action,
          status,
          details,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      throw new CustomError(`Failed to save sync log: ${error.message}`);
    }
  }

  /**
   * Get Level 4 Org Units grouped by their Parent Name (Level 3)
   */
  static async getGroupedOrgUnits() {
    try {
      const level4Units = await prisma.dHIS2OrgUnit.findMany({
        where: { level: 4 },
        select: {
          uuid: true,
          name: true,
          parentUuid: true,
          parentName: true,
        },
        orderBy: { parentName: "asc" },
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
    } catch (error) {
      throw new CustomError(`Failed to fetch grouped org units: ${error.message}`);
    }
  }
}

export default DHIS2OrgUnitRepository;
