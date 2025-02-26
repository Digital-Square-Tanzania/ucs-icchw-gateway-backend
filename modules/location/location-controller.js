import LocationService from "./location-service.js";
import ResponseHelper from "../../helpers/response-helper.js";
import CustomError from "../../utils/custom-error.js";

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
class LocationController {
  // Fetch all locations with pagination
  static async getAllLocations(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const locationsData = await LocationService.getAllLocations(page, limit);
      return ResponseHelper.success(res, "Locations retrieved successfully", locationsData);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch a location by ID
  static async getLocationById(req, res, next) {
    try {
      const { id } = req.params;
      const location = await LocationService.getLocationById(parseInt(id));

      if (!location) {
        throw new CustomError("Location not found", 404);
      }

      return ResponseHelper.success(res, "Location retrieved successfully", location);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch all location tags
  static async getAllLocationTags(req, res, next) {
    try {
      const tags = await LocationService.getAllLocationTags();
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

      const locationsData = await LocationService.getLocationsByTag(tag, page, limit);

      if (locationsData.locations.length === 0) {
        throw new CustomError(`No active locations found for tag: ${tag}`, 404);
      }

      return ResponseHelper.success(res, `Locations with tag ${tag} retrieved successfully`, locationsData);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Fetch paginated location hierarchy
  static async getLocationHierarchy(req, res, next) {
    try {
      const { page, limit } = req.query;
      const hierarchy = await LocationService.getLocationHierarchy(page, limit);
      return ResponseHelper.success(res, "Location hierarchy fetched successfully", hierarchy);
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }

  // Controller for grouped location hierarchy
  static async getGroupedLocationHierarchy(req, res) {
    try {
      const hierarchy = await LocationService.getGroupedLocationHierarchy();
      return ResponseHelper.success(res, "Grouped location hierarchy fetched successfully", hierarchy);
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  // Refresh the materialized view
  static async refreshLocationHierarchyView(_req, res, next) {
    try {
      await LocationService.refreshLocationHierarchyView();
      return ResponseHelper.success(res, "Materialized view refreshed successfully");
    } catch (error) {
      next(new CustomError(error.message, 500));
    }
  }
}

export default LocationController;
