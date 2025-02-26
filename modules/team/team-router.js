import { Router } from "express";
import UserRoleRouter from "./user-role/user-role-router.js";
import TeamRoleRouter from "./team-role/team-role-router.js";
import TeamRouter from "./team/team-router.js";

const router = Router();

router.use("/userrole", UserRoleRouter);
router.use("/teamrole", TeamRoleRouter);
router.use("/team", TeamRouter);

export default router;
