import jwt from "jsonwebtoken";
import BaseResponse from "../responders/base-responder.js";
import AuthRepository from "../modules/auth/auth-repository.js";

class AuthMiddleware {
  /**
   * Middleware for authenticating users using JWT Access Token.
   */
  static async authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return BaseResponse.error(res, "Authentication failed. No token provided.", 401);
    }

    try {
      // Verify Access Token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;

      // Check if the token is blacklisted
      const isBlacklisted = await AuthRepository.isTokenBlacklisted(token);
      const allTokensBlacklisted = await AuthRepository.isAllTokensBlacklisted(decoded.id);

      if (isBlacklisted || allTokensBlacklisted) {
        return BaseResponse.error(res, "Authentication failed. Token is blacklisted.", 401);
      }

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return BaseResponse.error(res, "Access token expired. Please refresh your token.", 401);
      }
      return BaseResponse.error(res, "Authentication failed. Invalid token.", 401);
    }
  }

  /**
   * Role-based access control middleware.
   * @param  {...any} allowedRoles
   */
  static authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      const userRole = req.user?.role;
      if (!allowedRoles.includes(userRole)) {
        return BaseResponse.error(res, "Access denied. Insufficient permissions.", 403);
      }

      next();
    };
  }

  static authRoles(...allowedRoles) {
    return (req, res, next) => {
      const userRole = req.user?.role;

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ success: false, message: "Access denied. Insufficient permissions.", data: null });
      }
    };
  }

  /**
   * Verify Refresh Token and issue a new Access Token.
   */
  static async verifyRefreshToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return BaseResponse.error(res, "No refresh token provided.", 400);
    }

    try {
      // Verify Refresh Token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if the refresh token is blacklisted
      const isBlacklisted = await AuthRepository.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        return BaseResponse.error(res, "Refresh token is blacklisted.", 401);
      }

      // Issue new Access Token
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" } // Short-lived access token
      );

      return BaseResponse.success(res, "New access token issued.", {
        accessToken: newAccessToken,
      });
    } catch (error) {
      return BaseResponse.error(res, "Invalid or expired refresh token.", 401);
    }
  }
}

export default AuthMiddleware;
