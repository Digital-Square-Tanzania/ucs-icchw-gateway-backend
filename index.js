import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "express-async-errors";
import ErrorHandler from "./helpers/error-handler.js";
import AuthRouter from "./modules/auth/auth-router.js";
import UserRouter from "./modules/user/user-router.js";
import OpenMrsRouter from "./modules/openmrs/openmrs-router.js";
import DHIS2Router from "./modules/dhis2/dhis2-router.js";
import DashboardRouter from "./modules/dashboard/dashboard-router.js";
import SecurityMiddleware from "./middlewares/security-middleware.js";

class AppServer {
  constructor() {
    this.app = express();
    this.port = process.env.NODE_PORT || 3010;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    BigInt.prototype.toJSON = function () {
      const int = Number.parseInt(this.toString());
      return int ?? this.toString();
    };
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
    this.app.use("/api/v1/openmrs", OpenMrsRouter);
    this.app.use("/api/v1/dhis2", DHIS2Router);
    this.app.use("/api/v1/dashboard", DashboardRouter);

    // default route for the API
    this.app.get("/", (req, res, next) => {
      res.status(200).json({ message: "Welcome to UCS User Management Backend" });
    });

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
