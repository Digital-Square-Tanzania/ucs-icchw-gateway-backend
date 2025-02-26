import { Router } from "express";
import AuthMiddleware from "../../middlewares/authentication-middleware.js";
import ValidationMiddleware from "../../middlewares/validation-middleware.js";
import LocationValidation from "./location-validation.js";
import LocationController from "./location-controller.js";

const router = Router();

// 🌐 Locations with Pagination & Filtering + Validation
router.get("/", AuthMiddleware.authenticate, ValidationMiddleware.validate(LocationValidation.getAllLocationsSchema()), LocationController.getAllLocations);

router.get("/:id", AuthMiddleware.authenticate, LocationController.getLocationById);

// All Location Tags
router.get("/tags/all", AuthMiddleware.authenticate, LocationController.getAllLocationTags);

// Location Tags - Get locations filtered by active status with pagination
router.get("/tags/:tag", AuthMiddleware.authenticate, LocationController.getLocationsByTag);

// Materialized View Endpoints
router.get("/hierarchy/all", AuthMiddleware.authenticate, LocationController.getLocationHierarchy);
router.get("/hierarchy/grouped", AuthMiddleware.authenticate, LocationController.getGroupedLocationHierarchy);
router.post("/hierarchy/refresh", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), LocationController.refreshLocationHierarchyView);

export default router;
