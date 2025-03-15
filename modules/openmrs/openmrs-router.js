import { Router } from "express";
import LocationRouter from "./location/openmrs-location-router.js";
import MemberRoleRouter from "./member-role/openmrs-member-role-router.js";
import TeamRoleRouter from "./team-role/openmrs-team-role-router.js";
import TeamRouter from "./team/openmrs-team-router.js";
import TeamMemberRouter from "./team-member/openmrs-team-member-router.js";

const router = Router();

router.use("/memberrole", MemberRoleRouter);
router.use("/teamrole", TeamRoleRouter);
router.use("/team", TeamRouter);
router.use("/location", LocationRouter);
router.use("/teammember", TeamMemberRouter);

export default router;
