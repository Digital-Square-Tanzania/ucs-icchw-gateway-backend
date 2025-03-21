import prisma from "../../../config/prisma.js";

class TeamMemberRepository {
  static async getTeamMembers(page = 1, pageSize = 10) {
    const openmrsTeamMembersCount = await prisma.openMRSTeamMember.count();
    const skip = (page - 1) * pageSize;
    const teamMembers = await prisma.openMRSTeamMember.findMany({
      skip: skip,
      take: pageSize,
    });

    return { users: teamMembers, total: openmrsTeamMembersCount };
  }

  static async upsertTeamMembers(teamMembers) {
    const upsertPromises = teamMembers.map((member) =>
      prisma.openMRSTeamMember.upsert({
        where: { openMrsUuid: member.openMrsUuid },
        update: {
          firstName: member.firstName,
          middleName: member.middleName,
          lastName: member.lastName,
          username: member.username,
          personUuid: member.personUuid,
          teamUuid: member.teamUuid,
          teamName: member.teamName,
          teamIdentifier: member.teamIdentifier,
          locationUuid: member.locationUuid,
          locationName: member.locationName,
          locationDescription: member.locationDescription,
          NIN: member.nin,
          email: member.email,
          phoneNumber: member.phoneNumber,
          updatedAt: new Date(),
        },
        create: member, // Create if not exists
      })
    );

    return Promise.all(upsertPromises);
  }

  static async findByUuid(uuid) {
    return prisma.openMRSTeamMember.findUnique({
      where: { openMrsUuid: uuid },
    });
  }

  static async createTeamMember(teamMemberData) {
    return prisma.openMRSTeamMember.create({
      data: teamMemberData,
    });
  }

  static async updateTeamMember(uuid, updateData) {
    return prisma.openMRSTeamMember.update({
      where: { openMrsUuid: uuid },
      data: updateData,
    });
  }

  static async upsertPersonAttributes(attributes) {
    const upsertPromises = attributes.map((attribute) =>
      prisma.openMRSPersonAttribute.upsert({
        where: {
          personUuid_attributeName: {
            personUuid: attribute.personUuid,
            attributeName: attribute.attributeName,
          },
        },
        update: {
          attributeTypeUuid: attribute.attributeTypeUuid,
          attributeValue: attribute.attributeValue,
        },
        create: {
          personUuid: attribute.personUuid,
          attributeTypeUuid: attribute.attributeTypeUuid,
          attributeName: attribute.attributeName,
          attributeValue: attribute.attributeValue,
        },
      })
    );

    return Promise.all(upsertPromises);
  }
}

export default TeamMemberRepository;
