import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthRepository from "./auth-repository.js";
import ApiLogger from "../../utils/api-logger.js";

class AuthService {
  static async login(req, email, password) {
    console.log("[auth/login] Login attempt for email:", email);
    let user = null;
    try {
      user = await AuthRepository.findUserByEmail(email);

      if (!user || user.isDeleted) {
        console.warn("[auth/login] Failed: user not found or isDeleted for email:", email);
        await ApiLogger.log(req, { statusCode: 401, body: { message: "Authentication failed (user not found or deleted)", email } });
        throw new Error("Authentication failed. Wrong username or password.");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.warn("[auth/login] Failed: wrong password for email:", email);
        await ApiLogger.log(req, { statusCode: 401, body: { message: "Authentication failed (wrong password)", email } });
        throw new Error("Authentication failed. Wrong username or password.");
      }

      // Update lastLogin timestamp
      await AuthRepository.updateLastLogin(user.id);

      // Create Access Token (Short-lived)
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role.name, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || "1h" } // Access token valid for 1 hour
      );

      const currentUser = { id: user.id, email: user.email, role: user.role.name, firstName: user.firstName, lastName: user.lastName };
      req.user = currentUser;

      // Create Refresh Token (Long-lived)
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role.name },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" } // Refresh token valid for 7 days
      );

      console.log("[auth/login] Success for user:", { id: user.id, email: user.email, role: user.role.name });
      await ApiLogger.log(req, { statusCode: 200, body: { message: "Login successful", user: { id: user.id, email: user.email, role: user.role.name } } });

      return { accessToken, refreshToken };
    } catch (err) {
      if (!(err instanceof Error) || err.message.startsWith("Authentication failed.") === false) {
        console.error("[auth/login] Unexpected error during login for email:", email, "-", err?.message || err);
        await ApiLogger.log(req, { statusCode: 500, body: { message: "Unexpected login error", email, error: err?.message || String(err) } });
      }
      throw err;
    }
  }

  static async logout(token, userId) {
    await AuthRepository.blacklistToken(token, userId);
  }

  static async logoutAll(userId) {
    await AuthRepository.blacklistAllUserTokens(userId);
  }

  // 🔹 Fetch user details by ID
  static async getProfile(userId) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) throw new Error("Wrong username or password.");

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
      joinDate: user.joinDate,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Verify Refresh Token and issue new Access Token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if refresh token is blacklisted
      const isBlacklisted = await AuthRepository.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error("Refresh token is blacklisted.");
      }

      // Issue new Access Token
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" } // New Access Token valid for 15 minutes
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error("Invalid or expired refresh token.");
    }
  }
}

export default AuthService;
