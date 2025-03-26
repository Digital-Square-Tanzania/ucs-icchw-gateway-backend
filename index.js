import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "express-async-errors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";

// Allow local dev & production frontend domains
const allowedOrigins = [
  "http://localhost:3015", // dev
  "http://170.187.199.69:3035", // prod
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import ErrorHelper from "./helpers/error-helper.js";
import AuthRouter from "./modules/auth/auth-router.js";
import UserRouter from "./modules/user/user-router.js";
import OpenMrsRouter from "./modules/openmrs/openmrs-router.js";
import DHIS2Router from "./modules/dhis2/dhis2-router.js";
import DashboardRouter from "./modules/dashboard/dashboard-router.js";
import GatewayRouter from "./modules/gateway/gateway-router.js";
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
    this.__dirname = path.dirname(fileURLToPath(import.meta.url));
  }

  initializeMiddleware() {
    this.app.disable("x-powered-by");
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cors());
    // this.app.use(SecurityMiddleware.applyHelmet());
    this.app.set("views", path.join(__dirname, "views"));
    this.app.set("view engine", "pug");
    this.app.use(express.static(path.join(__dirname, "public")));
    this.app.use(
      helmet({
        crossOriginOpenerPolicy: false,
        originAgentCluster: false,
      })
    );
    this.app.use((req, res, next) => {
      if (req.protocol === "https") {
        return res.redirect("http://" + req.headers.host + req.url);
      }
      next();
    });
    this.app.use((_req, res, next) => {
      res.removeHeader("Content-Security-Policy");
      next();
    });
  }

  initializeRoutes() {
    this.app.use("/api/v1/auth", AuthRouter);
    this.app.use("/api/v1/user", UserRouter);
    this.app.use("/api/v1/openmrs", OpenMrsRouter);
    this.app.use("/api/v1/dhis2", DHIS2Router);
    this.app.use("/api/v1/dashboard", DashboardRouter);
    this.app.use("/api/v1/gateway", GatewayRouter);

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
    const errorHandlerInstance = new ErrorHelper();
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
