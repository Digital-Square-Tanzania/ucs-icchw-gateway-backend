import prisma from "../../config/prisma.js";

class LocationRepository {
  // Fetch all locations with pagination
  static async getAllLocations(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        skip: offset,
        take: limit,
      }),
      prisma.location.count(),
    ]);

    return {
      locations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Fetch a single location by ID
  static async getLocationById(id) {
    return await prisma.location.findUnique({
      where: { location_id: id },
    });
  }

  // Fetch all location tags
  static async getAllLocationTags() {
    return await prisma.locationTag.findMany();
  }

  // Fetch locations by tag with pagination and retired = false
  static async getLocationsByTag(tagName, page = 1, limit = 10) {
    try {
      const currentPage = Number.isInteger(page) ? page : 1;
      const perPage = Number.isInteger(limit) ? limit : 10;
      const offset = (currentPage - 1) * perPage;

      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where: {
            retired: false,
            locationTagMaps: {
              some: {
                locationTag: {
                  name: tagName,
                },
              },
            },
          },
          select: {
            location_id: true,
            name: true,
            uuid: true,
            latitude: true,
            longitude: true,
          },
          skip: offset,
          take: perPage,
        }),
        prisma.location.count({
          where: {
            retired: false,
            locationTagMaps: {
              some: {
                locationTag: {
                  name: tagName,
                },
              },
            },
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
    return prisma.locationHierarchyView.findMany({
      skip: offset,
      take: limit,
    });
  }

  // Count total rows in materialized view
  static async countLocationHierarchy() {
    return prisma.locationHierarchyView.count();
  }

  // Fetch all location hierarchy data
  static async getFullLocationHierarchy() {
    return prisma.locationHierarchyView.findMany();
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView() {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW location_hierarchy_view`);
  }
}

export default LocationRepository;
