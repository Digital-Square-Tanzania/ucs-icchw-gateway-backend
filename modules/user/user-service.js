import bcrypt from "bcryptjs";
import UserRepository from "./user-repository.js";

class UserService {
  static async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;

    const newUser = await UserRepository.createUser(userData);
    const { password, ...safeUserData } = newUser;
    return safeUserData;
  }

  // 🔹 Pass pagination params
  static async getAllUsers(page, limit) {
    return UserRepository.getAllUsers(page, limit);
  }

  static async getUserById(userId) {
    const user = await UserRepository.getUserById(userId);
    if (!user) throw new Error("User not found.");
    const { password, ...safeUserData } = user;
    return safeUserData;
  }

  static async updateUser(userId, userData) {
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;
    }
    const updatedUser = await UserRepository.updateUser(userId, userData);
    const { password, ...safeUserData } = updatedUser;
    return safeUserData;
  }

  static async deleteUser(userId) {
    return UserRepository.deleteUser(userId);
  }
}

export default UserService;
