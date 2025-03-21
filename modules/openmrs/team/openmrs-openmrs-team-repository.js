import prisma from "../../../config/prisma.js";

class TeamRepository {
  static async upsertTeam(team) {
    return prisma.openMRSTeam.upsert({
      where: { uuid: team.uuid },
      update: {
        display: team.display,
        name: team.teamName,
        identifier: team.teamIdentifier,
        supervisorName: team.supervisor,
        supervisorUuid: team.supervisorUuid,
        voided: team.voided,
        voidReason: team.voidReason,
        members: team.members,
        locationName: team.location.name,
        locationUuid: team.location.uuid,
      },
      create: {
        uuid: team.uuid,
        display: team.display,
        name: team.teamName,
        identifier: team.teamIdentifier,
        supervisorName: team.supervisor,
        supervisorUuid: team.supervisorUuid,
        voided: team.voided,
        voidReason: team.voidReason,
        members: team.members,
        locationName: team.location.name,
        locationUuid: team.location.uuid,
        createdAt: new Date(team.dateCreated),
      },
    });
  }

  static async getAllTeams(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [teams, total] = await Promise.all([
      prisma.openMRSTeam.findMany({
        skip: offset,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.openMRSTeam.count(),
    ]);

    return { teams, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getTeamByUuid(uuid) {
    return prisma.openMRSTeam.findUnique({ where: { uuid } });
  }
}

export default TeamRepository;
