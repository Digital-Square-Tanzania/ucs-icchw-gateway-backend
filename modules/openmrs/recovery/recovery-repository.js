import prisma from "../../../config/prisma.js";

class RecoveryRepository {
  static async getAllUcsMasterPeople() {
    return prisma.ucsMaster.findMany({});
  }

  // Update the OpenMRS person with the given ID
  static async updateOpenmrsPerson(id, payload) {
    try {
      const updatedPerson = await prisma.ucsMaster.update({
        where: { id: id },
        data: payload,
      });
      return updatedPerson;
    } catch (error) {
      console.error("Error updating OpenMRS person:", error);
      throw new Error("Error updating OpenMRS person");
    }
  }

  // Update the OpenMRS person with the given username with userId and userUuid
  static async updateOpenmrsPersonById(id, payload) {
    try {
      const updatedPerson = await prisma.ucsMaster.update({
        where: { id: id },
        data: payload,
      });
      return updatedPerson;
    } catch (error) {
      console.error("Error updating OpenMRS person by username:", error);
      throw new Error("Error updating OpenMRS person by username");
    }
  }
}

export default RecoveryRepository;
