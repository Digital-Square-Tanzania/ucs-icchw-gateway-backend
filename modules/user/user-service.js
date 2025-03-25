import bcrypt from "bcryptjs";
import UserRepository from "./user-repository.js";
import CustomError from "../../utils/custom-error.js";
import prisma from "../../config/prisma.js";
import ApiLogger from "../../utils/api-logger.js";

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

  /**
   * Activate new CHW account route
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async renderActivationPage(req, res, next) {
    try {
      const slug = req.params.slug;
      const activation = await prisma.accountActivation.findUnique({
        where: {
          slug,
        },
      });
      if (!activation) throw new CustomError("Invalid activation link received.", 400);
      if (activation.isActivated) throw new CustomError("Account already activated.", 410);
      if (Date.now() > activation.expiryDate) throw new CustomError("Activation link expired.", 410);
      console.log("🔄 Valid activation link received, rendering activation page for slug: ", slug);
      ApiLogger.log(req, activation);
      return slug;
    } catch (error) {
      ApiLogger.error(req, { statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }

  /**
   * Handle new Activation route
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async activateChwAccount(slug, password, confirmPassword) {
    if (password !== confirmPassword) {
      return { alert: true, message: "Passwords do not match" };
    }

    const activation = await prisma.accountActivation.findUnique({ where: { slug } });

    if (!activation || activation.isActivated || Date.now() > new Date(activation.expiryDate)) {
      return { alert: true, message: "Invalid or expired activation link" };
    }

    // ✅ Hash password and activate account
    const hashedPassword = await bcrypt.hash(password, 10);

    // await prisma.user.update({
    //   where: { uuid: activation.userUuid },
    //   data: {
    //     password: hashedPassword,
    //     status: "ACTIVE",
    //   },
    // });

    // await prisma.accountActivation.update({
    //   where: { slug },
    //   data: {
    //     isActivated: true,
    //     usedAt: new Date(),
    //   },
    // });

    return { alert: false, message: "Account activated. You can now log in." };
  }
}

export default UserService;
