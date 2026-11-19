import { Router } from "express";
import TeamMemberController from "./openmrs-team-member-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";
import PermissionMiddleware from "../../../middlewares/permission-middleware.js";
import basicAuthMiddleware from "../../../middlewares/basic-auth-middleware.js";
import multer from "multer";

const router = Router();

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
  const allowedMimes = ["text/csv", "application/vnd.ms-excel"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only CSV files are allowed!"), false);
  }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

const openMrsView = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requireUserTab("openmrs", "view"),
];
const openMrsCreate = [
  AuthMiddleware.authenticate,
  PermissionMiddleware.loadUserPermissions,
  PermissionMiddleware.requireUserTab("openmrs", "create"),
];

router.get("/", ...openMrsView, TeamMemberController.getTeamMembers);
router.post("/", ...openMrsCreate, TeamMemberController.createTeamMember);
router.get("/sync", AuthMiddleware.authenticate, TeamMemberController.syncTeamMembers);
router.post(
  "/purge-orphans",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN"),
  TeamMemberController.purgeOrphanedLocalRecords
);
router.post(
  "/sync-local",
  AuthMiddleware.authenticate,
  AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN"),
  TeamMemberController.syncLocalTeamMembersAsync
);
router.put("/:uuid", ...openMrsCreate, TeamMemberController.updateTeamMember);
router.get("/:uuid", ...openMrsView, TeamMemberController.getTeamMemberByUuid);
router.delete("/person/:maxPersonId", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), TeamMemberController.deletePerson);

// Check for username availability
router.get("/username/search", ...openMrsCreate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN"), TeamMemberController.checkUsernameAvailability);

// Upload CSV file
router.post("/upload", ...openMrsCreate, upload.single("file"), TeamMemberController.uploadCsv);

// INTERNAL ROUTES
// Get team members by team UUID
router.get("/team/:teamUuid", TeamMemberController.getTeamMembersByTeamUuid);

export default router;
