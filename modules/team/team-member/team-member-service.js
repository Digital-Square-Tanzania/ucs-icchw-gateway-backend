import axios from "axios";
import dotenv from "dotenv";
import CustomError from "../../../utils/custom-error.js";
import TeamMemberRepository from "./team-member-repository.js";

dotenv.config();

class TeamMemberService {
  constructor() {
    this.baseUrl = process.env.OPENMRS_API_URL + "team/teammember";
    this.auth = {
      username: process.env.OPENMRS_API_USERNAME,
      password: process.env.OPENMRS_API_PASSWORD,
    };
  }

  async syncTeamMembers() {
    try {
      console.log(`🔄 Syncing team members from OpenMRS... URL: ${this.baseUrl}?v=full`);
      const response = await axios.get(`${this.baseUrl}?v=full`, { auth: this.auth });

      if (!response.data || !response.data.results) {
        throw new CustomError("No data received from OpenMRS.", 500);
      }

      const formattedMembers = response.data.results.map((member) => ({
        identifier: member.identifier,
        firstName: member.person?.preferredName?.givenName || "",
        middleName: member.person?.preferredName?.middleName || null,
        lastName: member.person?.preferredName?.familyName || "",
        username: member.identifier,
        personUuid: member.person?.uuid,
        openMrsUuid: member.uuid,
        teamUuid: member.team?.uuid || null,
        teamName: member.team?.teamName || null,
        teamIdentifier: member.team?.teamIdentifier || null,
        locationUuid: member.team?.location?.uuid || null,
        locationName: member.team?.location?.name || null,
        locationDescription: member.team?.location?.description || null,
        openmrsObject: member, // Store full OpenMRS object
      }));

      await TeamMemberRepository.upsertTeamMembers(formattedMembers);
      console.log("✅ Team members sync completed.");
    } catch (error) {
      throw new CustomError("Failed to sync team members.\n" + error.message, 500);
    }
  }

  async getTeamMemberByUuid(uuid) {
    const teamMember = await TeamMemberRepository.findByUuid(uuid);
    if (!teamMember) {
      throw new CustomError("Team member not found.", 404);
    }
    return teamMember;
  }

  async createTeamMember(teamMemberData) {
    try {
      console.log("🔄 Creating team member in OpenMRS...");

      // Send request to OpenMRS
      const openMrsResponse = await axios.post(this.baseUrl, teamMemberData, { auth: this.auth });

      if (!openMrsResponse.data || !openMrsResponse.data.uuid) {
        throw new CustomError("Failed to create team member in OpenMRS.", 500);
      }

      // Prepare data for local storage
      const formattedData = {
        identifier: teamMemberData.identifier,
        firstName: teamMemberData.person?.preferredName?.givenName || "",
        middleName: teamMemberData.person?.preferredName?.middleName || null,
        lastName: teamMemberData.person?.preferredName?.familyName || "",
        username: teamMemberData.identifier,
        personUuid: teamMemberData.person?.uuid,
        openMrsUuid: openMrsResponse.data.uuid,
        teamUuid: teamMemberData.team?.uuid || null,
        teamName: teamMemberData.team?.teamName || null,
        teamIdentifier: teamMemberData.team?.teamIdentifier || null,
        locationUuid: teamMemberData.locations?.[0]?.uuid || null,
        locationName: teamMemberData.locations?.[0]?.name || null,
        locationDescription: teamMemberData.locations?.[0]?.description || null,
        openmrsObject: openMrsResponse.data, // Store full OpenMRS response
      };

      const savedTeamMember = await TeamMemberRepository.createTeamMember(formattedData);
      console.log("✅ Team member created successfully.");
      return savedTeamMember;
    } catch (error) {
      throw new CustomError("Failed to create team member.", 500);
    }
  }

  async updateTeamMember(uuid, updateData) {
    try {
      console.log("🔄 Updating team member in OpenMRS...");

      // Send update request to OpenMRS
      await axios.put(`${this.baseUrl}/${uuid}`, updateData, { auth: this.auth });

      // Update locally
      const updatedTeamMember = await TeamMemberRepository.updateTeamMember(uuid, updateData);
      console.log("✅ Team member updated successfully.");
      return updatedTeamMember;
    } catch (error) {
      throw new CustomError("Failed to update team member.", 500);
    }
  }
}

export default new TeamMemberService();
