import prisma from "../../../config/prisma.js";

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
}

export default RecoveryRepository;
