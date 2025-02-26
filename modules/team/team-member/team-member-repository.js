import prisma from "../../../config/prisma.js";

class TeamMemberRepository {
  static async upsertTeamMembers(teamMembers) {
    const upsertPromises = teamMembers.map((member) =>
      prisma.teamMember.upsert({
        where: { openMrsUuid: member.openMrsUuid },
        update: member,
        create: member,
      })
    );
    return Promise.all(upsertPromises);
  }

  static async findByUuid(uuid) {
    return prisma.teamMember.findUnique({
      where: { openMrsUuid: uuid },
    });
  }

  static async createTeamMember(teamMemberData) {
    return prisma.teamMember.create({
      data: teamMemberData,
    });
  }

  static async updateTeamMember(uuid, updateData) {
    return prisma.teamMember.update({
      where: { openMrsUuid: uuid },
      data: updateData,
    });
  }
}

export default TeamMemberRepository;
