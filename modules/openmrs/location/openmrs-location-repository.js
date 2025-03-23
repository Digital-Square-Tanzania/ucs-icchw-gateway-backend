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
      throw new CustomError(error.stack);
    }
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

    if (!location) {
      throw new CustomError(`Location with code '${code}' not found`, 404);
    }

    return location;
  }
}

export default OpenMRSLocationRepository;
