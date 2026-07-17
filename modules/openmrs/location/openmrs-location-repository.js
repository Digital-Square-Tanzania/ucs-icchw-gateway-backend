import prisma from "../../../config/prisma.js";
import CustomError from "../../../utils/custom-error.js";

class OpenMRSLocationRepository {
  /**
   * Fetch Locations with Filters, Sorting, and Pagination
   */
  static async getAllLocations({ name, district, region, parentUuid, limit = 50, page = 1, sortBy = "display", order = "asc" }) {
    const filters = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }
    if (district) {
      filters.district = { contains: district, mode: "insensitive" };
    }
    if (region) {
      filters.region = { contains: region, mode: "insensitive" };
    }
    if (parentUuid) {
      filters.parentUuid = parentUuid;
    }

    const skip = (page - 1) * limit;

    const [locations, totalCount] = await Promise.all([
      prisma.openMRSLocation.findMany({
        where: filters,
        orderBy: { [sortBy]: order },
        skip,
        take: Number(limit),
      }),
      prisma.openMRSLocation.count({ where: filters }),
    ]);

    return {
      locations,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  // Fetch a single location by ID
  static async getLocationByUuid(uuid) {
    return await prisma.openMRSLocation.findUnique({
      where: { uuid: uuid },
    });
  }

  // Fetch all location tags
  static async getAllLocationTags() {
    return await prisma.openMRSLocationTag.findMany();
  }

  // Fetch all location attribute types
  static async getAllLocationAttributeTypes() {
    return await prisma.openMRSLocationAttributeType.findMany();
  }

  // Fetch locations by tag with pagination and retired = false
  static async getLocationsByTag(tagName, page = 1, limit = 10) {
    try {
      const currentPage = Number.isInteger(page) ? page : 1;
      const perPage = Number.isInteger(limit) ? limit : 10;
      const offset = (currentPage - 1) * perPage;

      const [locations, total] = await Promise.all([
        prisma.openMRSLocation.findMany({
          where: {
            retired: false,
            type: tagName,
          },
          skip: offset,
          take: perPage,
        }),
        prisma.openMRSLocation.count({
          where: {
            retired: false,
            type: tagName,
          },
        }),
      ]);

      return {
        locations,
        total,
        page: currentPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error) {
      console.error("Error fetching locations by tag:", error);
      throw new Error("Could not fetch locations by tag");
    }
  }

  // Fetch paginated location hierarchy from materialized view
  static async getLocationHierarchy(offset, limit) {
    return prisma.openMRSLocationHierarchyView.findMany({
      skip: offset,
      take: limit,
    });
  }

  // Count total rows in materialized view
  static async countLocationHierarchy() {
    return prisma.openMRSLocationHierarchyView.count();
  }

  // Fetch all location hierarchy data
  static async getFullLocationHierarchy() {
    return prisma.openMRSLocationHierarchyView.findMany();
  }

  /**
   * Get location codes for a given council (optionally scoped by region and district).
   * Used to filter activation stats by council. Returns empty array if no match.
   */
  static async getLocationCodesByCouncil(region, district, council) {
    if (!council || typeof council !== "string" || !council.trim()) {
      return [];
    }
    const rows = await prisma.openMRSLocationHierarchyView.findMany({
      where: {
        council: { equals: council.trim(), mode: "insensitive" },
        ...(region && region.trim() && { region: { equals: region.trim(), mode: "insensitive" } }),
        ...(district && district.trim() && { district: { equals: district.trim(), mode: "insensitive" } }),
      },
      select: { uuid: true },
    });
    const uuids = [...new Set(rows.map((r) => r.uuid).filter(Boolean))];
    if (uuids.length === 0) return [];
    const locations = await prisma.openMRSLocation.findMany({
      where: { uuid: { in: uuids }, locationCode: { not: null } },
      select: { locationCode: true },
    });
    const codes = [...new Set(locations.map((l) => l.locationCode).filter(Boolean))];
    return codes;
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView() {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW openmrs_location_hierarchy_view`);
  }

  /**
   * Upsert locations into the database
   */
  static async upsertLocations(locations) {
    try {
      const mappedLocations = locations.map((location) => {
        return {
          locationId: location.locationId || null,
          name: location.name || null,
          description: location.description || null,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          retired: location.retired || false,
          uuid: location?.uuid || null,
          parent: location.parentLocation?.uuid || null,
          type: location.tags?.[0]?.name || null,
          hfrCode: location?.hfrCode || null,
          locationCode: location?.locationCode || null,
          createdAt: location.dateCreated ? new Date(location.dateCreated) : null,
        };
      });

      return await prisma.openMRSLocation.createMany({
        data: mappedLocations,
        skipDuplicates: true,
      });
    } catch (error) {
      throw new CustomError(error.message);
    }
  }

  /**
   * Replace the entire openmrs_location table with a fresh set of rows in a
   * single transaction. Used by the fast DB-to-DB sync. Refuses to run with an
   * empty payload so a failed/empty upstream read never wipes existing data.
   */
  static async replaceAllLocations(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new CustomError("Refusing to replace locations: no rows fetched from OpenMRS database.");
    }

    const chunkSize = 1000;

    await prisma.$transaction(
      async (tx) => {
        await tx.openMRSLocation.deleteMany({});
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          await tx.openMRSLocation.createMany({ data: chunk, skipDuplicates: true });
        }
      },
      { timeout: 180000, maxWait: 30000 }
    );

    return rows.length;
  }

  /*
   * Upsert location tags into the database
   */
  static async upsertLocationTags(tags) {
    try {
      const mappedTags = tags.map((tag) => ({
        name: tag.name,
        description: tag.description || null,
        uuid: tag.uuid,
        createdAt: tag.auditInfo.dateCreated,
      }));
      return await prisma.openMRSLocationTag.createMany({
        data: mappedTags,
        skipDuplicates: true,
      });
    } catch (error) {
      throw new CustomError(`Failed to upsert location tags: ${error.message}`);
    }
  }

  /*
   * Upsert location attribute types into the database
   */
  static async upsertLocationAttributeTypes(attributeTypes) {
    try {
      const mappedLocationAttributeTypes = attributeTypes.map((attributeType) => ({
        name: attributeType.name,
        description: attributeType.description || null,
        dataType: attributeType.datatypeClassname,
        uuid: attributeType.uuid,
        createdAt: new Date(attributeType.auditInfo.dateCreated),
        updatedAt: new Date(attributeType.auditInfo.dateChanged),
      }));
      return await prisma.openMRSLocationAttributeType.createMany({
        data: mappedLocationAttributeTypes,
        skipDuplicates: true,
      });
    } catch (error) {
      throw new CustomError(`Failed to upsert location attribute types: ${error.message}`);
    }
  }

  /**
   * Save synchronization logs for OpenMRS Locations
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

  static async getTeamMembersByLocationHfrCode(hfrCode) {
    return prisma.openMRSTeamMember.findMany({
      where: {
        location: {
          hfrCode,
        },
      },
    });
  }

  // Fetch a single location by its locationCode (Code attribute)
  static async getLocationByHfrCode(hfrCode) {
    const location = await prisma.openMRSLocation.findFirst({
      where: {
        hfrCode: hfrCode,
      },
    });

    return location;
  }

  // Get location by locationCode
  static async getLocationByCode(locationCode) {
    return prisma.openMRSLocation.findFirst({
      where: {
        locationCode: locationCode,
      },
    });
  }

  /**
   * Upsert a single mirrored OpenMRS location row by uuid.
   * Used by on-demand MySQL fallback when registration hits a missing code.
   */
  static async upsertLocationRow(row) {
    if (!row?.uuid) {
      throw new CustomError("Cannot upsert location without uuid.");
    }

    const createData = {
      locationId: row.locationId,
      name: row.name || "",
      description: row.description || null,
      latitude: row.latitude != null ? String(row.latitude) : null,
      longitude: row.longitude != null ? String(row.longitude) : null,
      retired: Boolean(row.retired),
      uuid: row.uuid,
      parent: row.parent || null,
      type: row.type || null,
      hfrCode: row.hfrCode || null,
      locationCode: row.locationCode || null,
      createdAt: row.createdAt || new Date(),
    };

    const updateData = {
      name: createData.name,
      description: createData.description,
      latitude: createData.latitude,
      longitude: createData.longitude,
      retired: createData.retired,
      parent: createData.parent,
      type: createData.type,
      hfrCode: createData.hfrCode,
      locationCode: createData.locationCode,
    };

    try {
      return await prisma.openMRSLocation.upsert({
        where: { uuid: row.uuid },
        create: createData,
        update: updateData,
      });
    } catch (error) {
      // locationId is the PK; if OpenMRS id collides with an existing local row
      // that has a different uuid, fall back to update-by-uuid or create without
      // forcing the OpenMRS id.
      if (String(error?.code) === "P2002") {
        const existing = await prisma.openMRSLocation.findUnique({ where: { uuid: row.uuid } });
        if (existing) {
          return prisma.openMRSLocation.update({
            where: { uuid: row.uuid },
            data: updateData,
          });
        }
        const { locationId: _omit, ...withoutId } = createData;
        return prisma.openMRSLocation.create({ data: withoutId });
      }
      throw new CustomError(`Failed to upsert location ${row.uuid}: ${error.message}`);
    }
  }

  // Search for facilities by name allowing variations like Facility, Favility, facility, etc.
  static async searchFacilities(name) {
    return prisma.openMRSLocation.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        type: {
          in: ["Facility", "Facility_msd_code", "facility"],
        },
      },
      select: {
        name: true,
        uuid: true,
        hfrCode: true,
        parent: true,
      },
    });
  }

  // Search for hamlets by name
  static async searchHamlets(name) {
    return prisma.openMRSLocation.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        type: {
          in: ["Hamlet", "Village"],
        },
      },
      select: {
        name: true,
        uuid: true,
        locationCode: true,
        type: true,
      },
    });
  }

  // Search for facility hamlets by facility parent
  static async searchFacilityHamlets(facilityParent) {
    return prisma.openMRSLocation.findMany({
      where: {
        parent: facilityParent,
        type: {
          in: ["Hamlet", "Village"],
        },
      },
      select: {
        name: true,
        uuid: true,
        locationCode: true,
        type: true,
      },
    });
  }
}

export default OpenMRSLocationRepository;
