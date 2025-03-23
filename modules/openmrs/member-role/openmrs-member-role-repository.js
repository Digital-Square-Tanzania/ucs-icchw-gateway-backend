import prisma from "../../../config/prisma.js";

class MemberRoleRepository {
  static async upsertMemberRoles(roles) {
    const transactions = roles.map((role) =>
      prisma.openMRSMemberRole.upsert({
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

  static async getAllMemberRoles() {
    return await prisma.openMRSMemberRole.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        display: true,
        description: true,
      },
    });
  }

  static async getMemberRoleById(id) {
    return await prisma.openMRSMemberRole.findUnique({
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

  // Get member roles by role name
  static async getRoleUuidByRoleName(name) {
    return await prisma.openMRSMemberRole.findFirst({
      where: { name },
      select: {
        uuid: true,
      },
    });
  }
}

export default MemberRoleRepository;
