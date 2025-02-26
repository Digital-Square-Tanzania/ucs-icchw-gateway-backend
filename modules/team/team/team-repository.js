import prisma from "../../../config/prisma.js";

class TeamRepository {
  static async createOrUpdateTeam(uuid, name) {
    return prisma.team.upsert({
      where: { uuid },
      update: { name },
      create: { uuid, name },
    });
  }

  static async getAllTeams(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        skip: offset,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.team.count(),
    ]);

    return { teams, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async getTeamByUuid(uuid) {
    return prisma.team.findUnique({ where: { uuid } });
  }
}

export default TeamRepository;
