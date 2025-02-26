import LocationRepository from "./location-repository.js";

class LocationService {
  // Get all locations with pagination
  static async getAllLocations(page = 1, limit = 10) {
    return await LocationRepository.getAllLocations(page, limit);
  }

  // Get a location by ID
  static async getLocationById(id) {
    return await LocationRepository.getLocationById(id);
  }

  // Get locations by tag with pagination
  static async getLocationsByTag(tagName, page, limit) {
    return await LocationRepository.getLocationsByTag(tagName, page, limit);
  }

  // Get paginated location hierarchy
  static async getLocationHierarchy(page = 1, limit = 10) {
    const currentPage = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 10;
    const offset = (currentPage - 1) * perPage;

    const [locations, total] = await Promise.all([LocationRepository.getLocationHierarchy(offset, perPage), LocationRepository.countLocationHierarchy()]);

    return {
      locations,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  // Get grouped location hierarchy with separated facilities and villages
  static async getGroupedLocationHierarchy() {
    const flatLocations = await LocationRepository.getFullLocationHierarchy();

    const groupedHierarchy = {};

    flatLocations.forEach((location) => {
      const { country, zone, region, district, council, ward, name, type, uuid } = location;

      // Initialize country
      if (!groupedHierarchy[country]) {
        groupedHierarchy[country] = { name: country, zones: {} };
      }

      // Initialize zone
      if (!groupedHierarchy[country].zones[zone]) {
        groupedHierarchy[country].zones[zone] = { name: zone, regions: {} };
      }

      // Initialize region
      if (!groupedHierarchy[country].zones[zone].regions[region]) {
        groupedHierarchy[country].zones[zone].regions[region] = { name: region, districts: {} };
      }

      // Initialize district
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district] = { name: district, councils: {} };
      }

      // Initialize council
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council] = { name: council, wards: {} };
      }

      // Initialize ward
      if (!groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward]) {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward] = {
          name: ward,
          facilities: [], // For Facility types
          villages: [], // For Village types
        };
      }

      // Add to either facilities or villages based on type
      const facilityObj = { name, type, uuid };

      if (type === "Village") {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward].villages.push(facilityObj);
      } else {
        groupedHierarchy[country].zones[zone].regions[region].districts[district].councils[council].wards[ward].facilities.push(facilityObj);
      }
    });

    return groupedHierarchy;
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView() {
    return await LocationRepository.refreshLocationHierarchyView();
  }
}

export default LocationService;
