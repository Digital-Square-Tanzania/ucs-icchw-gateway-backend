import dotenv from "dotenv";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import TeamRoleRepository from "../team-role/openmrs-team-role-repository.js";
import TeamMemberRepository from "./openmrs-team-member-repository.js";
import mysqlClient from "../../../utils/mysql-client.js";

dotenv.config();

class TeamMemberService {
  constructor() {
    this.baseUrl = process.env.OPENMRS_API_URL + "team/teammember";
    this.auth = {
      username: process.env.OPENMRS_API_USERNAME,
      password: process.env.OPENMRS_API_PASSWORD,
    };
  }

  static async getTeamMembers(page = 1, limit = 10) {
    return await TeamMemberRepository.getTeamMembers(page, limit);
  }

  static async syncTeamMembers(pageSize = 500) {
    try {
      console.log("🔄 Syncing Team Members from OpenMRS in batches...");

      let fetchedRecords = 0;
      let totalFetched = 0;

      while (true) {
        console.log(`📥 Fetching records starting at index ${fetchedRecords}...`);

        const response = await openmrsApiClient.get("team/teammember", {
          v: "custom:(uuid,identifier,dateCreated,teamRole,person:(uuid,attributes:(uuid,display,value,attributeType:(uuid,display)),preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
          startIndex: fetchedRecords,
          limit: pageSize,
        });

        const teamMembers = response.results || [];
        const fetchedCount = teamMembers.length;

        if (fetchedCount === 0) {
          console.log(`✅ No more team members to fetch. Total synced: ${totalFetched}`);
          break;
        }

        const formattedMembers = [];

        for (const member of teamMembers) {
          try {
            if (!member.identifier || !member.uuid || !member.person) {
              throw new Error("Missing identifier or person data");
            }

            let nin = null;
            let email = null;
            let phoneNumber = null;

            if (member.person.attributes?.length) {
              for (const attr of member.person.attributes) {
                if (attr.attributeType?.display === "NIN") nin = attr.value;
                if (attr.attributeType?.display === "email") email = attr.value;
                if (attr.attributeType?.display === "phoneNumber") phoneNumber = attr.value;
              }
            }

            formattedMembers.push({
              identifier: member.identifier,
              firstName: member.person?.preferredName?.givenName || "",
              middleName: member.person?.preferredName?.middleName || null,
              lastName: member.person?.preferredName?.familyName || "",
              personUuid: member.person?.uuid,
              openMrsUuid: member.uuid,
              teamUuid: member.team?.uuid || null,
              teamName: member.team?.teamName || null,
              teamIdentifier: member.team?.teamIdentifier || null,
              locationUuid: member.team?.location?.uuid || null,
              locationName: member.team?.location?.name || null,
              locationDescription: member.team?.location?.description || null,
              roleUuid: member.teamRole?.uuid || null,
              roleName: member.teamRole?.name || null,
              NIN: nin,
              email,
              phoneNumber,
              createdAt: new Date(member.dateCreated),
            });
          } catch (err) {
            console.warn(`⚠️ Skipping team member due to error: ${err.message} (UUID: ${member?.uuid || "N/A"})`);
          }
        }

        const uniqueMembers = [];
        const seenIdentifiers = new Set();

        for (const member of formattedMembers) {
          if (!seenIdentifiers.has(member.identifier)) {
            seenIdentifiers.add(member.identifier);
            uniqueMembers.push(member);
          } else {
            console.warn(`⚠️ Duplicate identifier in batch: ${member.identifier}, skipping...`);
          }
        }

        for (const member of uniqueMembers) {
          try {
            await TeamMemberRepository.upsertTeamMember(member);
          } catch (err) {
            if (err.code === "P2002") {
              console.warn(`⚠️ Skipping duplicate identifier: ${member.identifier}`);
              continue;
            }
            console.error(`❌ Error upserting member ${member.identifier}:`, err.message);
          }
        }

        totalFetched += fetchedCount;
        fetchedRecords += fetchedCount;

        console.log(`✅ Synced ${formattedMembers.length} valid team members (Fetched: ${fetchedCount})`);
      }

      console.log("✅ OpenMRS Team Members Sync Completed.");
    } catch (error) {
      throw new CustomError("❌ OpenMRS Team Members Sync Error: " + error);
    }
  }

  static async getTeamMemberByUuid(uuid) {
    const teamMember = await TeamMemberRepository.findByUuid(uuid);
    if (!teamMember) {
      throw new CustomError("Team member not found.", 404);
    }
    return teamMember;
  }

  static async createTeamMember(username, userUuid, hfrCode, teamMemberLocationUuid, teamUuid, personUuid) {
    try {
      console.log("🔄 Creating team member in OpenMRS...");

      const identifierRole = await TeamRoleRepository.getTeamRoleUuidByIdentifier(process.env.DEFAULT_ICCHW_TEAM_ROLE_IDENTIFIER);
      const teamMemberObject = {
        identifier: username + hfrCode.replace("-", ""),
        locations: [
          {
            uuid: teamMemberLocationUuid,
          },
        ],
        joinDate: new Date().toISOString().split("T")[0],
        team: {
          uuid: teamUuid,
        },
        teamRole: {
          uuid: identifierRole.uuid,
        },
        person: {
          uuid: personUuid,
        },
        isDataProvider: "false",
      };

      // Send the request to OpenMRS server using OpenMRS API Client
      const newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);

      if (!newTeamMember || !newTeamMember.uuid) {
        throw new CustomError("Failed to create team member in OpenMRS.", 500);
      }
      console.log("New Team Member Created in OpenMRS:");

      // Fetch the newly created team member details
      const newTeamMemberDetails = await openmrsApiClient.get(`team/teammember/${newTeamMember.uuid}`, {
        v: "custom:(uuid,identifier,dateCreated,teamRole,person:(uuid,attributes:(uuid,display,value,attributeType:(uuid,display)),preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
      });

      // Check if the CHW exists in team members by NIN
      const identifiedTeamMember = await TeamMemberRepository.getTeamMemberByIdentifier(newTeamMemberDetails.identifier);

      if (identifiedTeamMember) {
        throw new ApiError("Duplicate CHW ID found.", 409, 2);
      }

      let formattedMember = {};

      // Extract attributes for NIN, email, and phoneNumber
      let nin = null;
      let email = null;
      let phoneNumber = null;

      if (newTeamMemberDetails.person?.attributes?.length) {
        for (const attr of newTeamMemberDetails.person.attributes) {
          if (attr.attributeType?.display === "NIN") {
            nin = attr.value;
          } else if (attr.attributeType?.display === "email") {
            email = attr.value;
          } else if (attr.attributeType?.display === "phoneNumber") {
            phoneNumber = attr.value;
          }
        }
      }

      // Format team member data
      formattedMember = {
        identifier: newTeamMemberDetails.identifier,
        firstName: newTeamMemberDetails.person?.preferredName?.givenName || "",
        middleName: newTeamMemberDetails.person?.preferredName?.middleName || null,
        lastName: newTeamMemberDetails.person?.preferredName?.familyName || "",
        personUuid: newTeamMemberDetails.person?.uuid,
        username: username,
        userUuid: userUuid,
        openMrsUuid: newTeamMemberDetails.uuid,
        teamUuid: newTeamMemberDetails.team?.uuid || null,
        teamName: newTeamMemberDetails.team?.teamName || null,
        teamIdentifier: newTeamMemberDetails.team?.teamIdentifier || null,
        locationUuid: newTeamMemberDetails.team?.location?.uuid || null,
        locationName: newTeamMemberDetails.team?.location?.name || null,
        locationDescription: newTeamMemberDetails.team?.location?.description || null,
        roleUuid: newTeamMemberDetails.teamRole?.uuid || null,
        roleName: newTeamMemberDetails.teamRole?.name || null,
        NIN: nin,
        email,
        phoneNumber,
        createdAt: new Date(newTeamMemberDetails.dateCreated),
      };

      // Save the returned object as a new team member in the database
      const savedTeamMember = await TeamMemberRepository.upsertTeamMember(formattedMember);

      return savedTeamMember;
    } catch (error) {
      throw new CustomError("Failed to create team member." + error.message, 500);
    }
  }

  static async updateTeamMember(uuid, updateData) {
    try {
      console.log("🔄 Updating team member in OpenMRS...");

      // Send update request to OpenMRS
      await openmrsApiClient.put(`${this.baseUrl}/${uuid}`, updateData);

      // Update locally
      const updatedTeamMember = await TeamMemberRepository.updateTeamMember(uuid, updateData);
      console.log("✅ Team member updated successfully.");
      return updatedTeamMember;
    } catch (error) {
      throw new CustomError("Failed to update team member.", 500);
    }
  }

  static async deletePerson(personId) {
    try {
      const deletedPerson = await mysqlClient.query("CALL delete_person(?)", [personId]);
      console.log(`✅ Successfully deleted person with ID: ${personId}`);
      return deletedPerson;
    } catch (deleteError) {
      throw new CustomError(`❌ Failed to delete person with ID: ${personId} ${deleteError}`, 500);
    }
  }
}

export default TeamMemberService;
