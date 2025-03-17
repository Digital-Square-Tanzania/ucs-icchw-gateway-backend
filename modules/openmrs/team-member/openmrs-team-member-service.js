import dotenv from "dotenv";
import CustomError from "../../../utils/custom-error.js";
import TeamMemberRepository from "./openmrs-team-member-repository.js";
import openmrsApiClient from "../openmrs-api-client.js";

dotenv.config();

class TeamMemberService {
  constructor() {
    this.baseUrl = process.env.OPENMRS_API_URL + "team/teammember";
    this.auth = {
      username: process.env.OPENMRS_API_USERNAME,
      password: process.env.OPENMRS_API_PASSWORD,
    };
  }

  async getTeamMembers(page = 1, limit = 10) {
    return await TeamMemberRepository.getTeamMembers(page, limit);
  }

  async syncTeamMembers(pageSize = 500) {
    try {
      console.log("🔄 Syncing Team Members from OpenMRS in batches...");

      let fetchedRecords = 0;
      let totalFetched = 0;

      while (true) {
        console.log(`📥 Fetching records starting at index ${fetchedRecords}...`);

        // Fetch the current batch using OpenMRSApiClient
        const response = await openmrsApiClient.get("team/teammember", {
          v: "custom:(uuid,identifier,dateCreated,teamRole,person:(uuid,preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
          startIndex: fetchedRecords,
          limit: pageSize,
        });

        const teamMembers = response.results || [];
        const fetchedCount = teamMembers.length;

        if (fetchedCount === 0) {
          console.log(`✅ No more team members to fetch. Total synced: ${totalFetched}`);
          break; // Stop loop if no more members
        }

        // Format team member data
        const formattedMembers = teamMembers.map((member) => ({
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
          createdAt: new Date(member.dateCreated),
          roleUuid: member.teamRole?.uuid || null,
          roleName: member.teamRole?.name || null,
        }));

        // Store the batch in the database
        await TeamMemberRepository.upsertTeamMembers(formattedMembers);

        totalFetched += fetchedCount;
        fetchedRecords += fetchedCount; // Increase fetched count based on actual returned records

        console.log(`✅ Synced ${fetchedCount} team members, Total synced: ${totalFetched}`);
      }

      console.log("✅ OpenMRS Team Members Sync Completed.");
    } catch (error) {
      throw new CustomError("❌ OpenMRS Team Members Sync Error: " + error.message);
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
      const openMrsResponse = await openmrsApiClient.post(this.baseUrl, teamMemberData, { auth: this.auth });

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
        createdAt: new Date(openMrsResponse.data.dateCreated),
        roleUuid: teamMemberData.teamRole?.uuid || null,
        roleName: teamMemberData.teamRole?.name || null,
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
      await openmrsApiClient.put(`${this.baseUrl}/${uuid}`, updateData, { auth: this.auth });

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
