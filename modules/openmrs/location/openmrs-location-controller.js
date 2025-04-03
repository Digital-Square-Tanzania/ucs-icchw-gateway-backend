import OpenMRSLocationService from "./openmrs-location-service.js";
import ResponseHelper from "../../../helpers/response-helper.js";
import CustomError from "../../../utils/custom-error.js";
import { parse } from "dotenv";

/*
 * @description Location controller class to handle location related operations.
 * @class LocationController
 * @static getAllLocations - Fetch all locations with pagination.
 * @static getLocationById - Fetch a location by ID.
 * @static getAllLocationTags - Fetch all location tags.
 * @static getLocationsByTag - Fetch locations by tag with pagination.
 * @static getLocationHierarchy - Fetch paginated location hierarchy.
 * @static getFullLocationHierarchy - Fetch all location hierarchy data.
 * @static refreshLocationHierarchyView - Refresh the materialized view.
 * @memberof LocationController
 * @exports LocationController
 * @requires LocationService
 * @requires ResponseHelper
 * @requires CustomError
 */
class OpenMRSLocationController {
  /**
   * Fetch all locations with filtering, sorting, and pagination
   */
  static async getAllLocations(req, res, next) {
    try {
      const { name, type, parentUuid, limit, page, sortBy, order } = req.query;
      const locations = await OpenMRSLocationService.getAllLocations({
        name,
        type,
        parentUuid,
        limit: parseInt(limit) || 50,
        page: parseInt(page) || 1,
        sortBy: sortBy || "name",
        order: order || "asc",
      });

      ResponseHelper.success(res, "OpenMRS locations retrieved successfully.", locations);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch a location by ID
  static async getLocationByUuid(req, res, next) {
    try {
      const { uuid } = req.params;
      const location = await OpenMRSLocationService.getLocationByUuid(uuid);

      if (!location) {
        throw new CustomError("Location not found", 404);
      }

      return ResponseHelper.success(res, "Location retrieved successfully", location);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch all location tags
  static async getAllLocationTags(_req, res, next) {
    try {
      const tags = await OpenMRSLocationService.getAllLocationTags();
      return ResponseHelper.success(res, "Location tags retrieved successfully", tags);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch locations by tag with pagination
  static async getLocationsByTag(req, res, next) {
    try {
      const { tag } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const locationsData = await OpenMRSLocationService.getLocationsByTag(tag, page, limit);

      if (locationsData.locations.length === 0) {
        throw new CustomError(`No active locations found for tag: ${tag}`, 404);
      }

      return ResponseHelper.success(res, `Locations with tag ${tag} retrieved successfully`, locationsData);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Get all location attribute types
  static async getAllLocationAttributeTypes(_req, res, next) {
    try {
      const attributeTypes = await OpenMRSLocationService.getAllLocationAttributeTypes();
      return ResponseHelper.success(res, "Location attribute types retrieved successfully", attributeTypes);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch paginated location hierarchy
  static async getLocationHierarchy(req, res, next) {
    try {
      const { page, limit } = req.query;
      const hierarchy = await OpenMRSLocationService.getLocationHierarchy(page, limit);
      return ResponseHelper.success(res, "Location hierarchy fetched successfully", hierarchy);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Controller for grouped location hierarchy
  static async getGroupedLocationHierarchy(_req, res) {
    try {
      const hierarchy = await OpenMRSLocationService.getGroupedLocationHierarchy();
      return ResponseHelper.success(res, "Grouped location hierarchy fetched successfully", hierarchy);
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView(_req, res, next) {
    try {
      await OpenMRSLocationService.refreshLocationHierarchyView();
      return ResponseHelper.success(res, "Materialized view refreshed successfully");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Sync locations from OpenMRS in batches
  static async syncLocations(req, res, next) {
    try {
      const { pageSize } = req.query.pageSize;
      await OpenMRSLocationService.syncLocations(parseInt(pageSize) || 1000);
      ResponseHelper.success(res, "OpenMRS locations synced successfully.");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Sync location tags
  static async syncLocationTags(req, res, next) {
    try {
      await OpenMRSLocationService.syncLocationTags();
      ResponseHelper.success(res, "OpenMRS location tags synced successfully.");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Sync location attribute types
  static async syncLocationAttributeTypes(req, res, next) {
    try {
      await OpenMRSLocationService.syncLocationAttributeTypes();
      ResponseHelper.success(res, "OpenMRS location attribute types synced successfully.");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Search facilities by name
  static async searchFacilities(req, res, next) {
    try {
      const { q: name } = req.query;
      if (!name) {
        throw new CustomError("Query parameter 'q' is required", 400);
      }
      const facilities = await OpenMRSLocationService.searchFacilities(name);
      return ResponseHelper.success(res, "Facilities retrieved successfully", facilities);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Search hamlets by name
  static async searchHamlets(req, res, next) {
    try {
      const { q: name } = req.query;
      if (!name) {
        throw new CustomError("Query parameter 'q' is required", 400);
      }
      const hamlets = await OpenMRSLocationService.searchHamlets(name);
      return ResponseHelper.success(res, "Hamlets retrieved successfully", hamlets);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }
}

export default OpenMRSLocationController;
