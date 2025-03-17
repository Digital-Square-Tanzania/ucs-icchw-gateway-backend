import prisma from "../../../config/prisma.js";

class DHIS2UserRepository {
  static async upsertUsers(users) {
    const formattedUsers = users.map((user) => ({
      uuid: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.surname,
      phoneNumber: user.phoneNumber || user.whatsApp || null,
      email: user.email || null,
      roleUuids: user.userRoles?.map((role) => role.id) || [],
      orgUnitUuids: user.organisationUnits?.map((orgUnit) => orgUnit.id) || [],
    }));

    await prisma.dHIS2User.createMany({
      data: formattedUsers,
      skipDuplicates: true,
    });
  }

  static async createUser(user) {
    return await prisma.dHIS2User.create({ data: user });
  }

  static async getUsers() {
    return await prisma.dHIS2User.findMany();
  }

  static async deleteUser(userId) {
    return await prisma.dHIS2User.delete({ where: { uuid: userId } });
  }
}

export default DHIS2UserRepository;
