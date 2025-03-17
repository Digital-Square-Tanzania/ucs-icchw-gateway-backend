import prisma from "../../../config/prisma.js";

class DHIS2RoleRepository {
  static async upsertRoles(roles) {
    const formattedRoles = roles.map((role) => ({
      uuid: role.id,
      name: role.displayName,
    }));

    await prisma.dHIS2Role.createMany({
      data: formattedRoles,
      skipDuplicates: true,
    });
  }

  static async getRoles() {
    return await prisma.dHIS2Role.findMany();
  }
}

export default DHIS2RoleRepository;
