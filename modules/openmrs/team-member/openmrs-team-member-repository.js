import prisma from "../../../config/prisma.js";
import CustomError from "../../../utils/custom-error.js";

class TeamMemberRepository {
  /**
   * Get team members
   * @param {number} page - Page number
   * @param {number} pageSize - Number of items per page
   * @returns {Promise<Object>} - Team members and total count
   */
  static async getTeamMembers(page = 1, pageSize = 10) {
    const openmrsTeamMembersCount = await prisma.openMRSTeamMember.count();
    const skip = (page - 1) * pageSize;
    const teamMembers = await prisma.openMRSTeamMember.findMany({
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: pageSize,
      select: {
        openMrsUuid: true,
        username: true,
        firstName: true,
        middleName: true,
        lastName: true,
        roleName: true,
        teamName: true,
        locationName: true,
      },
    });

    // Rename openMrsUuid to uuid in the response
    const formattedTeamMembers = teamMembers.map((member) => ({
      uuid: member.openMrsUuid,
      username: member.username,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      roleName: member.roleName,
      teamName: member.teamName,
      locationName: member.locationName,
    }));

    return { users: formattedTeamMembers, total: openmrsTeamMembersCount };
  }

  /**
   * Upsert team members
   * @param {Array} teamMembers - Array of team members
   * @returns {Promise<Array>} - Upserted team members
   */
  static async upsertTeamMembers(teamMembers) {
    const upsertPromises = teamMembers.map((member) =>
      prisma.openMRSTeamMember.upsert({
        where: { identifier: member.identifier },
        update: {
          firstName: member.firstName,
          middleName: member.middleName,
          lastName: member.lastName,
          username: member.username,
          personUuid: member.personUuid,
          userUuid: member.userUuid,
          username: member.username,
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

  /**
   * Upsert team member
   * @param {Object} teamMember - Team member object
   * @returns {Promise<Object>} - Upserted team member object
   */
  static async upsertTeamMember(teamMember) {
    return prisma.openMRSTeamMember.upsert({
      where: { openMrsUuid: teamMember.openMrsUuid },
      update: {
        firstName: teamMember.firstName,
        middleName: teamMember.middleName,
        lastName: teamMember.lastName,
        personUuid: teamMember.personUuid,
        username: teamMember.username,
        userUuid: teamMember.userUuid,
        teamUuid: teamMember.teamUuid,
        teamName: teamMember.teamName,
        teamIdentifier: teamMember.teamIdentifier,
        locationUuid: teamMember.locationUuid,
        locationName: teamMember.locationName,
        locationDescription: teamMember.locationDescription,
        NIN: teamMember.nin,
        email: teamMember.email,
        phoneNumber: teamMember.phoneNumber,
        updatedAt: new Date(),
      },
      create: teamMember, // Create if not exists
    });
  }

  /**
   * Get team member by UUID
   * @param {string} uuid - Team member UUID
   * @returns {Promise<Object>} - Team member object
   */
  static async findByUuid(uuid) {
    return prisma.openMRSTeamMember.findUnique({
      where: { openMrsUuid: uuid },
    });
  }

  /**
   * Get team member by username
   * @param {string} username - Team member username
   * @returns {Promise<Object>} - Team member object
   */
  static async createTeamMember(teamMemberData) {
    return prisma.openMRSTeamMember.create({
      data: teamMemberData,
    });
  }

  /**
   * Update team member by UUID
   * @param {string} uuid - Team member UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated team member object
   */
  static async updateTeamMember(uuid, updateData) {
    return prisma.openMRSTeamMember.update({
      where: { openMrsUuid: uuid },
      data: updateData,
    });
  }

  /**
   * Get team members by location HFR code
   * @param {string} hfrCode - Location HFR code
   * @returns {Promise<Array>} - Array of team members
   */
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

  /**
   * Upsert person attributes
   * @param {Array} attributes - Array of person attributes
   * @returns {Promise<Array>} - Upserted person attributes
   */
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

  /**
   * Get team member by NIN
   * @param {string} nin - Team member NIN
   * @returns {Promise<Object>} - Team member object
   */
  static async getTeamMemberByNin(nin) {
    return prisma.openMRSTeamMember.findFirst({
      where: { NIN: nin },
    });
  }

  /**
   * Get username counter by NIN
   * @param {string} nin - Team member NIN
   * @returns {Promise<Object>} - Username counter object
   */
  static async getUsernameCounterByNin(nin) {
    return prisma.openMRSUsernameCounter.findFirst({
      where: { NIN: nin },
      select: { counter: true },
    });
  }

  /**
   * Update username counter stats
   * @param {string} nin - Team member NIN
   * @param {number} counter - Counter value
   * @returns {Promise<Object>} - Updated or created username counter object
   */
  static async updateUsernameCounterStats(nin, counter) {
    return prisma.openMRSUsernameCounter.upsert({
      where: {
        NIN: nin,
      },
      update: {
        counter: parseInt(counter),
        updatedAt: new Date(),
      },
      create: {
        NIN: nin,
        counter: 1,
      },
    });
  }

  /**
   * Get location HFR code by locationUuid
   * @param {string} locationUuid - Location UUID
   * @returns {Promise<string|null>} - Location HFR code or null if not found
   */
  static async getLocationHfrCodeByUuid(locationUuid) {
    const location = await prisma.openMRSLocation.findUnique({
      where: { uuid: locationUuid },
      select: { hfrCode: true },
    });

    return location ? location.hfrCode : null;
  }
}

export default TeamMemberRepository;
