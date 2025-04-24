// import prisma from "../../../config/prisma.js";
import { PrismaClient, recoveryStatus } from "@prisma/client";
const prisma = new PrismaClient();
const PENDING = recoveryStatus.PENDING;

class RecoveryRepository {
  static async getAllUcsMasterPeople() {
    return prisma.ucsMaster.findMany({
      distinct: ["username"],
      where: {
        usernameDuplicate: false,
      },
    });
  }

  // Get all recovered accounts
  static async getAllRecoveredAccounts() {
    return prisma.recoveredAccounts.findMany({
      where: {
        isDuplicate: false,
      },
    });
  }

  // Get pending recovered accounts
  static async getPendingRecoveredAccounts() {
    return prisma.recoveredAccounts.findMany({
      where: {
        isDuplicate: false,
        recoveryStatus: PENDING,
      },
    });
  }

  // Update the OpenMRS person with the given ID
  static async updateOpenmrsPerson(id, payload) {
    try {
      const updatedPerson = await prisma.recoveredAccounts.update({
        where: { id: id },
        data: payload,
      });
      return updatedPerson;
    } catch (error) {
      console.error("Error updating OpenMRS person:", error.message);
      throw new Error("Error updating OpenMRS person");
    }
  }

  // Update the OpenMRS person with the given username with userId and userUuid
  static async updateOpenmrsPersonById(id, payload) {
    try {
      const updatedPerson = await prisma.recoveredAccounts.update({
        where: { id: id },
        data: payload,
      });
      return updatedPerson;
    } catch (error) {
      console.error("Error updating OpenMRS person by username:", error.message);
      throw new Error("Error updating OpenMRS person by username");
    }
  }

  static async createRecoveredAccounts(payload) {
    try {
      const createdAccount = await prisma.recoveredAccounts.createMany({
        data: payload,
        skipDuplicates: true,
      });
      console.log(`[SUCCESS] Inserted ${createdAccount.count} new recovered accounts`);
      return createdAccount.count;
    } catch (error) {
      console.error("Error creating recovered accounts:", error);
      throw new Error("Error creating recovered accounts");
    }
  }

  static async getMissingOpenmrsTeams() {
    try {
      const missingTeams = await prisma.recoveredAccounts.findMany({
        distinct: ["team_name", "team_uuid", "location_uuid"],
        where: {
          error_log: "OpenMRS team missing location info.",
        },
        select: {
          team_name: true,
          team_uuid: true,
          location_uuid: true,
        },
      });
      return missingTeams;
    } catch (error) {
      console.error("Error fetching missing OpenMRS teams:", error);
      throw new Error("Error fetching missing OpenMRS teams");
    }
  }
}

export default RecoveryRepository;
