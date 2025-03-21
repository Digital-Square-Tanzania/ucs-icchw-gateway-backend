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

  static async getUsers(offset, pageSize) {
    try {
      const dhis2UserCount = await prisma.dHIS2User.count();

      const users = await prisma.dHIS2User.findMany({
        skip: offset,
        take: pageSize,
        select: {
          id: true,
          uuid: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          orgUnitUuids: true,
          roleUuids: true,
          disabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Fetch all roles and store in a map
      const roles = await prisma.dHIS2Role.findMany({
        select: { uuid: true, name: true },
      });
      const roleMap = new Map(roles.map((role) => [role.uuid, role.name]));

      // Fetch all organization units (facilities & councils) and store in a map
      const orgUnits = await prisma.dHIS2OrgUnit.findMany({
        select: { uuid: true, name: true, parentUuid: true, parentName: true, level: true },
      });
      const orgUnitMap = new Map(orgUnits.map((org) => [org.uuid, org]));

      // Format the users
      const formattedUsers = users.map((user) => {
        // Get first linked facility (Level 4)
        const facility = user.orgUnitUuids?.length ? orgUnitMap.get(user.orgUnitUuids[0]) : null;
        const facilityName = facility ? facility.name : "N/A";
        const councilName = facility && facility.parentUuid ? orgUnitMap.get(facility.parentUuid)?.name : "N/A";

        return {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          firstName: user.firstName || "N/A",
          lastName: user.lastName || "N/A",
          email: user.email || "N/A",
          phoneNumber: user.phoneNumber || "N/A",
          roles: user.roleUuids?.map((roleUuid) => roleMap.get(roleUuid) || "Unknown Role") || [],
          facilityName,
          councilName,
          disabled: user.disabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      });
      return { users: formattedUsers, total: dhis2UserCount };
    } catch (error) {
      console.error("❌ Failed to fetch users:", error.message);
      throw new Error("Failed to retrieve users.");
    }
  }

  static async deleteUser(userId) {
    return await prisma.dHIS2User.delete({ where: { uuid: userId } });
  }
}

export default DHIS2UserRepository;
