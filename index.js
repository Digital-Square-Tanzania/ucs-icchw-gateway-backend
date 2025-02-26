import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "express-async-errors";
import ErrorHandler from "./helpers/error-handler.js";
import AuthRouter from "./modules/auth/auth-router.js";
import UserRouter from "./modules/user/user-router.js";
import LocationRouter from "./modules/location/location-router.js";
import TeamRoleRouter from "./modules/team/team-role/team-role-router.js";
import TeamRouter from "./modules/team/team/team-router.js";
import SecurityMiddleware from "./middlewares/security-middleware.js";

class AppServer {
  constructor() {
    this.app = express();
    this.port = process.env.NODE_PORT || 3010;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    this.app.disable("x-powered-by");
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cors());
    this.app.use(SecurityMiddleware.applyHelmet());
  }

  initializeRoutes() {
    this.app.use("/api/v1/auth", AuthRouter);
    this.app.use("/api/v1/user", UserRouter);
    this.app.use("/api/v1/location", LocationRouter);
    this.app.use("/api/v1/team/teamrole", TeamRoleRouter);
    this.app.use("/api/v1/team/team", TeamRouter);

    // health-checker kwa ajili ya kudhibitisha kama server iko up
    this.app.get("/health", (req, res, next) => {
      res.status(200).json({ status: "UP" });
    });
  }

  initializeErrorHandling() {
    const errorHandlerInstance = new ErrorHandler();
    // Global error handler
    this.app.use((err, req, res, next) => {
      errorHandlerInstance.handleError(err, req, res, next);
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log("***** INFO: UCS User Management Backend is Listening on:" + this.port + " *****");
    });
  }
}

const appServer = new AppServer();
appServer.start();

export default AppServer;
