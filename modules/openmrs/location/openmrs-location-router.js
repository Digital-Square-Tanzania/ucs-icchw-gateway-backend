import { Router } from "express";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";
import ValidationMiddleware from "../../../middlewares/validation-middleware.js";
import OpenMRSLocationValidation from "./openmrs-location-validation.js";
import OpenMRSLocationController from "./openmrs-location-controller.js";

const router = Router();

// 🌐 Locations with Pagination & Filtering + Validation
router.get("/", AuthMiddleware.authenticate, ValidationMiddleware.validate(OpenMRSLocationValidation.getAllLocationsSchema()), OpenMRSLocationController.getAllLocations);

// Sync Locations
router.get("/sync", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), OpenMRSLocationController.syncLocations);

// Get Location by ID
router.get("/:id", AuthMiddleware.authenticate, OpenMRSLocationController.getLocationById);

// All Location Tags
router.get("/tags/all", AuthMiddleware.authenticate, OpenMRSLocationController.getAllLocationTags);

// Sync Location Tags
router.get("/tags/sync", AuthMiddleware.authenticate, OpenMRSLocationController.syncLocationTags);

// Location Tags - Get locations filtered by active status with pagination
router.get("/tags/:tag", AuthMiddleware.authenticate, OpenMRSLocationController.getLocationsByTag);

// All Location Attribute Types
router.get("/attributetypes/all", AuthMiddleware.authenticate, OpenMRSLocationController.getAllLocationAttributeTypes);

// Sync Location Attributes
router.get("/attributetypes/sync", AuthMiddleware.authenticate, OpenMRSLocationController.syncLocationAttributeTypes);

// Materialized View Endpoints
router.get("/hierarchy/all", AuthMiddleware.authenticate, OpenMRSLocationController.getLocationHierarchy);
router.get("/hierarchy/grouped", AuthMiddleware.authenticate, OpenMRSLocationController.getGroupedLocationHierarchy);
router.post("/hierarchy/refresh", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), OpenMRSLocationController.refreshLocationHierarchyView);

export default router;
