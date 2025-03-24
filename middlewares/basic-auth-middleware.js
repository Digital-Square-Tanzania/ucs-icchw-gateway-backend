import { Buffer } from "node:buffer";
import CustomError from "../utils/custom-error.js";
import dotenv from "dotenv";
dotenv.config();

class BasicAuthMiddleware {
  constructor(validUsername, validPassword) {
    // Binding class method so `this` stays correct
    this.authenticate = this.authenticate.bind(this);
  }

  authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    console.log("Valid Username: ", this.validUsername);
    console.log("Valid Password: ", this.validPassword);

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return next(new CustomError("Missing or invalid Authorization header", 401));
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
    const [username, password] = credentials.split(":");

    if (username === this.validUsername && password === this.validPassword) {
      // Optionally attaching user context to request
      req.user = { username, role: "EXTERNAL_SYSTEM" };
      return next();
    } else {
      return next(new CustomError("Invalid credentials", 401));
    }
  }
}

export default new BasicAuthMiddleware();
