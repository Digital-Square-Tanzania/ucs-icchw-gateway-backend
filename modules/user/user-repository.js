import prisma from "../../config/prisma.js";

class UserRepository {
  static async createUser(data) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: { select: { id: true, name: true } },
        status: true,
        joinDate: true,
        lastLogin: true,
      },
    });
  }

  // 🔹 Updated method with pagination
  static async getAllUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { isDeleted: false },
        skip: offset,
        take: limit,
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: { select: { id: true, name: true } },
          status: true,
          joinDate: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({ where: { isDeleted: false } }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: { select: { id: true, name: true } },
        status: true,
        joinDate: true,
        lastLogin: true,
      },
    });
  }

  static async updateUser(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: { select: { id: true, name: true } },
        status: true,
        joinDate: true,
        lastLogin: true,
      },
    });
  }

  static async deleteUser(id) {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

export default UserRepository;
