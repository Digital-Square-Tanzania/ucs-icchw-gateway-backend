import prisma from "../../config/prisma.js";
import CustomError from "../../utils/custom-error.js";

class GatewayRepository {
  static async getTeamMembersByLocationHfrCode(hfrCode) {
    try {
      // Step 1: Find location UUID by hfrCode
      const location = await prisma.openMRSLocation.findFirst({
        where: {
          hfrCode: {
            equals: hfrCode,
          },
        },
        select: {
          uuid: true,
          name: true,
          type: true,
        },
      });

      if (!location) {
        throw new CustomError("Location with provided HFR code not found.", 404);
      }

      // Step 2: Find team members by location UUID
      const teamMembers = await prisma.openMRSTeamMember.findMany({
        where: {
          locationUuid: location.uuid,
        },
        select: {
          username: true,
          NIN: true,
        },
      });

      // Step 3: Format response
      if (teamMembers.length === 0) {
        throw new CustomError("Team members not found.", 404);
      }

      const formatted = teamMembers.map((m) => ({
        NationalIdentificationNumber: m.NIN ?? "N/A",
        OpenmrsProviderId: m.username,
      }));

      // Step 4: Return response
      return formatted;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode);
    }
  }
}

export default GatewayRepository;
