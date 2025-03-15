import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthRepository from "./auth-repository.js";

class AuthService {
  static async login(email, password) {
    const user = await AuthRepository.findUserByEmail(email);

    if (!user || user.isDeleted) {
      throw new Error("Authentication failed. Wrong username or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
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

    // Create Refresh Token (Long-lived)
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" } // Refresh token valid for 7 days
    );

    return { accessToken, refreshToken };
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
