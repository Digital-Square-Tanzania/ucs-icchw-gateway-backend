import prisma from "../../../config/prisma.js";

class UserRoleRepository {
  static async upsertUserRoles(roles) {
    const transactions = roles.map((role) =>
      prisma.userRole.upsert({
        where: { uuid: role.uuid },
        update: {
          name: role.name,
          display: role.display,
          description: role.description,
        },
        create: {
          uuid: role.uuid,
          name: role.name,
          display: role.display,
          description: role.description,
        },
      })
    );

    return await prisma.$transaction(transactions);
  }

  static async getAllUserRoles() {
    return await prisma.userRole.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        display: true,
        description: true,
      },
    });
  }

  static async getUserRoleById(id) {
    return await prisma.userRole.findUnique({
      where: { id },
      select: {
        id: true,
        uuid: true,
        name: true,
        display: true,
        description: true,
      },
    });
  }
}

export default UserRoleRepository;
