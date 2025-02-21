import jwt from "jsonwebtoken";
import ResponseHelper from "../helpers/response-helper.js";
import AuthRepository from "../modules/auth/auth-repository.js";

class AuthMiddleware {
  /**
   * Middleware for authenticating users using JWT.
   */
  static async authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return ResponseHelper.error(res, "Authentication failed. No token provided.", 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Check if the token or all tokens are blacklisted
      const isBlacklisted = await AuthRepository.isTokenBlacklisted(token);
      const allTokensBlacklisted = await AuthRepository.isAllTokensBlacklisted(decoded.id);

      if (isBlacklisted || allTokensBlacklisted) {
        return ResponseHelper.error(res, "Authentication failed. Token is blacklisted.", 401);
      }

      next();
    } catch (error) {
      return ResponseHelper.error(res, "Authentication failed. Invalid token.", 401);
    }
  }

  // 🔑 Role-based access control
  static authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      const userRole = req.user?.role;

      if (!allowedRoles.includes(userRole)) {
        return ResponseHelper.error(res, "Access denied. Insufficient permissions.", 403);
      }

      next();
    };
  }
}

export default AuthMiddleware;
