import prisma from "../../config/prisma.js";

class AuthRepository {
  static async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  static async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
  }

  // Update lastLogin timestamp
  static async updateLastLogin(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  static async blacklistToken(token, userId) {
    return prisma.blacklistedToken.create({
      data: { token, userId },
    });
  }

  static async isTokenBlacklisted(token) {
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { token },
    });
    return !!blacklistedToken; // Returns true if token exists, false otherwise
  }

  static async blacklistAllUserTokens(userId) {
    return prisma.blacklistedToken.createMany({
      data: [{ userId, token: "ALL_TOKENS" }], // Marks all tokens invalid
    });
  }

  static async isAllTokensBlacklisted(userId) {
    const entry = await prisma.blacklistedToken.findFirst({
      where: { userId, token: "ALL_TOKENS" },
    });
    return !!entry; // Returns true if all tokens are blacklisted
  }
}

export default AuthRepository;
