import { Router } from "express";
import TeamMemberController from "./openmrs-team-member-controller.js";
import AuthMiddleware from "../../../middlewares/authentication-middleware.js";
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

router.get("/", AuthMiddleware.authenticate, TeamMemberController.getTeamMembers);
router.post("/", AuthMiddleware.authenticate, TeamMemberController.createTeamMember);
router.get("/sync", AuthMiddleware.authenticate, TeamMemberController.syncTeamMembers);
router.put("/:uuid", AuthMiddleware.authenticate, TeamMemberController.updateTeamMember);
router.get("/:uuid", AuthMiddleware.authenticate, TeamMemberController.getTeamMemberByUuid);
router.delete("/person/:maxPersonId", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER"), TeamMemberController.deletePerson);

// Check for username availability
router.get("/username/search", AuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("UCS_DEVELOPER", "MOH_ADMIN"), TeamMemberController.checkUsernameAvailability);

// Upload CSV file
router.post("/upload", AuthMiddleware.authenticate, upload.single("file"), TeamMemberController.uploadCsv);

// INTERNAL ROUTES
// Get team members by team UUID
router.get("/team/:teamUuid", basicAuthMiddleware.authenticate, AuthMiddleware.authorizeRoles("EXTERNAL_SYSTEM"), TeamMemberController.getTeamMembersByTeamUuid);

export default router;
