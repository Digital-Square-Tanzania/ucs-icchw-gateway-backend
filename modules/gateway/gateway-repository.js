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
        },
      });

      if (!location) {
        throw new Error("Location with provided HFR code not found.");
      }

      const teamMembers = await prisma.openMRSTeamMember.findMany({
        where: {
          locationUuid: location.uuid,
        },
        select: {
          username: true,
          NIN: true,
        },
      });

      const formatted = teamMembers.map((m) => ({
        NationalIdentificationNumber: m.NIN ?? "N/A",
        OpenmrsProviderId: m.username,
      }));
      return formatted;
    } catch (error) {
      // console.error("Error fetching team members by location HFR code:", error.message);
      // throw new CustomError("Error fetching team members by location HFR code:", 500);
      throw new CustomError(error.message);
    }
  }
}

export default GatewayRepository;
