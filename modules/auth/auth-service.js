import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthRepository from "./auth-repository.js";

class AuthService {
  static async login(email, password) {
    const user = await AuthRepository.findUserByEmail(email);

    if (!user || user.isDeleted) {
      throw new Error("Authentication failed. User not found.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Authentication failed. Wrong username or password.");
    }

    // Update lastLogin timestamp
    await AuthRepository.updateLastLogin(user.id);

    // Create the token for returning
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role.name }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return { token };
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
    if (!user) throw new Error("User not found.");

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
}

export default AuthService;
