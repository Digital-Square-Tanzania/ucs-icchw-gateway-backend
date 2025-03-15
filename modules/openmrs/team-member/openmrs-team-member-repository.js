import prisma from "../../../config/prisma.js";

class TeamMemberRepository {
  static async getTeamMembers() {
    return prisma.openMRSTeamMember.findMany();
  }

  // static async upsertTeamMembers(teamMembers) {
  //   const upsertPromises = teamMembers.map((member) =>
  //     prisma.openMRSTeamMember.upsert({
  //       where: { openMrsUuid: member.openMrsUuid },
  //       update: member,
  //       create: member,
  //     })
  //   );
  //   return Promise.all(upsertPromises);
  // }

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
          openmrsObject: member.openmrsObject, // Store full OpenMRS object
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
}

export default TeamMemberRepository;
