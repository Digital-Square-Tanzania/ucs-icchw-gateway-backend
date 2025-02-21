import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "express-async-errors";
import ErrorHandler from "./helpers/error-handler.js";
import AuthRouter from "./modules/auth/auth-router.js";
import UserRouter from "./modules/user/user-router.js";

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
  }

  initializeRoutes() {
    this.app.use("/api/v1/auth", AuthRouter);
    this.app.use("/api/v1/users", UserRouter);
  }

  initializeErrorHandling() {
    const errorHandlerInstance = new ErrorHandler();
    // Global error handler
    this.app.use((err, req, res, next) => {
      errorHandlerInstance.handleError(err, req, res, next);
    });

    // health-checker kwa ajili ya kudhibitisha kama server iko up
    this.app.get("/health", (req, res, next) => {
      res.status(200).json({ status: "UP" });
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
