import dotenv from "dotenv";
import CustomError from "../../../utils/custom-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import TeamRoleRepository from "../team-role/openmrs-team-role-repository.js";
import TeamMemberRepository from "./openmrs-team-member-repository.js";
import mysqlClient from "../../../utils/mysql-client.js";
import ApiError from "../../../utils/api-error.js";
import { CsvProcessor } from "../../../utils/csv-processor.js";
import EmailService from "../../../utils/email-service.js";
import ApiLogger from "../../../utils/api-logger.js";
import OpenmrsHelper from "../../gateway/helpers/openmrs-helper.js";

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
          v: "custom:(uuid,identifier,dateCreated,teamRole,person:(id,uuid,attributes:(uuid,display,value,attributeType:(uuid,display)),preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
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

            // Get user details from MySQL
            const userDetails = await mysqlClient.query("SELECT user_id, uuid, username, person_id FROM users WHERE person_id = ?", [member.person.id]);
            if (userDetails.length === 0) {
              console.warn(` > ⚠️ Skipping team member with UUID ${member.uuid} due to missing user details.`);
              continue;
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
              username: userDetails[0].username,
              userUuid: userDetails[0].uuid,
              createdAt: new Date(member.dateCreated),
            });
          } catch (err) {
            console.warn(` > ⚠️ Skipping team member due to error: ${err.message} (UUID: ${member?.uuid || "N/A"})`);
          }
        }

        const uniqueMembers = [];
        const seenIdentifiers = new Set();

        for (const member of formattedMembers) {
          if (!seenIdentifiers.has(member.identifier)) {
            seenIdentifiers.add(member.identifier);
            uniqueMembers.push(member);
          } else {
            console.warn(` > ⚠️ Duplicate identifier in batch: ${member.identifier}, skipping...`);
          }
        }

        for (const member of uniqueMembers) {
          try {
            await TeamMemberRepository.upsertTeamMember(member);
          } catch (err) {
            if (err.code === "P2002") {
              console.warn(` > ⚠️ Skipping duplicate identifier: ${member.identifier}`);
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

  // Create a new team member in OpenMRS and in Postgres
  static async createTeamMember(newUser, payload, validatedContent, newPerson) {
    let personId = newPerson.id;
    try {
      console.log("🔄 Creating team member in OpenMRS...");
      const identifierRole = await TeamRoleRepository.getTeamRoleUuidByIdentifier(process.env.DEFAULT_ICCHW_TEAM_ROLE_IDENTIFIER);
      const teamMemberObject = {
        identifier: newUser.username + payload.message.body[0].hfrCode.replace("-", ""),
        locations: [
          {
            uuid: validatedContent.teamMemberLocation.uuid,
          },
        ],
        joinDate: new Date().toISOString().split("T")[0],
        team: {
          uuid: validatedContent.team.uuid,
        },
        teamRole: {
          uuid: identifierRole.uuid,
        },
        person: {
          uuid: newPerson.uuid,
        },
        isDataProvider: "false",
      };

      // Send the request to OpenMRS server using OpenMRS API Client
      const newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);

      if (!newTeamMember.uuid) {
        await mysqlClient.query("USE openmrs");
        console.log("Deleting person with ID:", newPerson.id);
        await mysqlClient.query("CALL delete_person(?)", [newPerson.id]);
        console.log(`✅ Successfully deleted person with ID: ${newPerson.id}`);
        throw new CustomError("❌ Failed to create team member in OpenMRS.", 500);
      }
      console.log("New Team Member Created in OpenMRS:");
      console.log("🔄 Creating a local team member account in UCS.");

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
        username: newUser.username,
        userUuid: newUser.uuid,
        openMrsUuid: newPerson.uuid,
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
      console.log("Team member created locally.");
      console.log(`✅ CHW account created successfuly.`);

      return savedTeamMember;
    } catch (error) {
      await mysqlClient.query("USE openmrs");
      console.log("Deleting person with ID:", personId);
      await mysqlClient.query("CALL delete_person(?)", [personId]);
      console.log(`✅ Successfully deleted person with ID: ${personId}`);

      throw new CustomError("Failed to create team member: " + error.stack, 500);
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

  // Endpoint to manually delete a person
  static async deletePerson(personId) {
    try {
      await mysqlClient.query("USE openmrs");
      console.log(`🔄 Deleting person with ID: ${personId}...`);
      await mysqlClient.query("CALL delete_person(?)", [personId]);
      console.log(`✅ Successfully deleted person with ID: ${personId}`);
    } catch (error) {
      throw new CustomError(`❌ Failed to delete person with ID: ${personId} ${error.message}`, 500);
    }
  }

  // Search for username availability
  static async isUsernameAvailable(username) {
    const isAvailable = await TeamMemberRepository.isUsernameAvailable(username);
    return isAvailable;
  }

  // Upload CSV file and process it
  static async processCsv(req) {
    const file = req.file;
    try {
      if (!file || !file.buffer) {
        throw new Error("No valid file buffer provided.");
      }

      const rows = await CsvProcessor.readCsvFromBuffer(file.buffer);
      console.log(`DATA >> Parsed ${rows.length} rows from CSV.`);

      const teams = await openmrsApiClient.get("team/team", {
        v: "custom:(uuid,teamName,teamIdentifier,display,location:(uuid,name,description))",
      });

      const accepted = [];
      const rejected = [];

      // 🧠 Cache to track teams per locationUuid
      const teamCache = {};

      for (const [index, row] of rows.entries()) {
        if (!row || typeof row !== "object") {
          console.warn(` > ⚠️ Skipping invalid row at index ${index}:`, row);
          continue;
        }

        // Check if the location is valid and exists in OpenMRS
        let locationResult = await mysqlClient.query("SELECT uuid FROM location WHERE name = ?", [row.ward.trim()]);
        const locationUuid = locationResult.length > 0 ? locationResult[0].uuid : null;

        // Check if the user exists in OpenMRS
        let userResult = await mysqlClient.query("SELECT uuid, person_id FROM users WHERE username = ?", [row.username.trim()]);

        // Create an empty person object
        let newPerson = {};
        if (userResult.length <= 0) {
          rejected.push({
            ...row,
            rejectionReason: "User is not yet registered in OpenMRS.",
            rowNumber: index + 2,
          });
          // TODO: Create this person and user in OpenMRS
          let payload = {};
          payload.message = {};
          payload.message.body = [];
          payload.message.body.push({
            firstName: row.first_name?.trim() || "",
            middleName: row.middle_name?.trim() || "",
            lastName: row.last_name?.trim() || "",
            sex: row.sex?.trim().toLowerCase() || "",
            birthDate: "1990-07-01", // Default date, iCCHW won't use this, their birthDate comes from NIN
            phoneNumber: null,
            email: null,
            NIN: null,
          });

          console.log(`Creating person ${row.first_name.trim()} ${row.last_name.trim()} in OpenMRS:`);

          newPerson = await OpenmrsHelper.createOpenmrsPerson(payload);
          if (!newPerson || !newPerson.uuid) {
            console.log(" > ❌ Failed to create person in OpenMRS.");
          }

          userResult.push({
            uuid: newPerson.uuid,
            person_id: newPerson.person_id,
            username: row.username.trim(),
          });
        }

        // Log user result to see if it is populated correctly
        console.log(` > User Result for ${row.username.trim()}:`, userResult);

        // If user exists, fetch the person UUID
        let personUuid = null;
        let personId = null;
        if (userResult.length > 0 && userResult[0].person_id) {
          const personResult = await mysqlClient.query("SELECT person_id, uuid FROM person WHERE person_id = ?", [userResult[0].person_id]);

          // If person exists, use its UUID else use the new person UUID
          personUuid = newPerson.uuid || personResult.length > 0 ? personResult[0].uuid : null;
          personId = newPerson.person_id || personResult.length > 0 ? personResult[0].person_id : null;
        }

        console.log("Person UUID:", personUuid);
        console.log("Person ID:", personId);

        let team = teamCache[locationUuid];

        if (!team) {
          // First check in OpenMRS existing teams
          team = teams.results.find((t) => t.location && t.location.uuid === locationUuid);

          // If not found, create and cache it
          if (!team) {
            console.warn(` > ⚠️ No team found for ward: ${row.ward.trim()}`);
            team = await openmrsApiClient.post("team/team", {
              teamName: row.ward_name.trim() + " Ward Team",
              teamIdentifier: row.ward_name.trim() + "WardTeam",
              location: { uuid: locationUuid },
            });
          }

          teamCache[locationUuid] = team;
        }

        const cleaned = {
          firstName: row.first_name?.trim() || "",
          middleName: row.middle_name?.trim() || "",
          lastName: row.last_name?.trim() || "",
          sex: row.gender?.trim().toUpperCase() || "",
          region: row.regional_name?.trim() || "",
          council: row.council_name?.trim() || "",
          ward: row.ward?.trim() || "",
          wardUuid: locationUuid,
          username: row.username?.trim() || "",
          userUuid: (userResult.length > 0 ? userResult[0].uuid : null) || null,
          personUuid: personUuid || null,
          password: row.password?.trim() || "",
          identifier: row.user_identifier?.trim() || "",
          intervention: row.intervention?.trim() || "",
          role: row.user_role?.trim() || "",
          teamName: team.teamName || null,
          teamUuid: team.uuid || null,
          teamIdentifier: team.teamIdentifier || null,
          originalRow: row,
          rowNumber: index + 2,
        };

        // Check if the CHW exists in team members by NIN
        const teamMemberExists = await mysqlClient.query("SELECT uuid, identifier FROM team_member WHERE identifier = ?", [row.user_identifier.trim()]);
        if (teamMemberExists.length > 0) {
          rejected.push({
            ...row,
            rejectionReason: "✔ Team Member is already registered.",
            rowNumber: index + 2,
          });
          console.warn(` > 🚨 Duplicate CHW ID found: ${row.user_identifier.trim()}, process aborted...`);
          continue;
        }

        const isValid =
          cleaned.firstName && cleaned.lastName && cleaned.sex && cleaned.council && cleaned.ward && cleaned.username && cleaned.password && cleaned.identifier && teamMemberExists.length === 0;

        if (isValid) {
          accepted.push(cleaned);
        } else {
          rejected.push({
            ...cleaned,
            rejectionReason: "Missing required fields",
          });
        }

        const teamRoleUuid = process.env.UCS_PROD_PROVIDER_ROLE_UUID_PROD;
        const teamMemberObject = {
          identifier: cleaned.identifier,
          locations: [
            {
              uuid: cleaned.wardUuid,
            },
          ],
          joinDate: new Date().toISOString().split("T")[0],
          team: {
            uuid: cleaned.teamUuid,
          },
          teamRole: {
            uuid: teamRoleUuid,
          },
          person: {
            uuid: cleaned.personUuid,
          },
          isDataProvider: "false",
        };

        // Send the request to OpenMRS server using OpenMRS API Client
        const newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);

        if (!newTeamMember.uuid) {
          // Delete the person if team member creation fails
          await mysqlClient.query("USE openmrs");
          console.log("Deleting person with ID:", personId);
          await mysqlClient.query("CALL delete_person(?)", [personId]);
          console.log(`✅ Successfully deleted person with ID: ${personId}`);
          console.error("❌ Failed to create team member in OpenMRS.");
          rejected.push({
            ...row,
            rejectionReason: "Failed to create team member in OpenMRS.",
            rowNumber: index + 2,
          });
          // throw new CustomError("❌ Failed to create team member in OpenMRS.", 500);
          continue;
        }
        console.log(" > 🚧 New Team Member Created in OpenMRS: \n > 🔄 Creating the new member locally!");

        let formattedMember = {};

        // Format team member data
        formattedMember = {
          identifier: cleaned.identifier,
          firstName: cleaned.firstName || "",
          middleName: cleaned.middleName || null,
          lastName: cleaned.lastName || "",
          personUuid: cleaned.personUuid,
          username: cleaned.username,
          userUuid: cleaned.userUuid,
          openMrsUuid: newTeamMember.uuid,
          teamUuid: cleaned.teamUuid || null,
          teamName: cleaned.teamName || null,
          teamIdentifier: cleaned.teamIdentifier || null,
          locationUuid: cleaned.wardUuid || null,
          locationName: cleaned.ward || null,
          locationDescription: "ADDO ward in UCS" || null,
          roleUuid: teamRoleUuid || null,
          roleName: "UCS Provider" || null,
          NIN: null,
          email: null,
          phoneNumber: null,
          createdAt: new Date("2024-10-01T12:01:00Z"), // Placeholder date, adjust as needed
        };

        // Check if the CHW exists in team members by identifier
        const identifiedTeamMember = await TeamMemberRepository.getTeamMemberByIdentifier(cleaned.identifier);
        if (identifiedTeamMember) {
          rejected.push({
            ...row,
            rejectionReason: "Duplicate team member already exists",
            rowNumber: index + 2,
          });
          console.warn(`🚨 Duplicate CHW ID found: ${cleaned.identifier}, process aborted...`);
          continue;
        }

        // Save the returned object as a new team member in the database
        const newTeamMemberRecord = await TeamMemberRepository.upsertTeamMember(formattedMember);
        console.log(` > 🚧 Team member ${cleaned.firstName + " " + cleaned.lastName} CHW account created.`);

        await ApiLogger.log(req, { member: newTeamMember, identifier: cleaned.identifier });
        console.log(" > 📝 Process logged successfully.");
      }

      const result = {
        total: rows.length,
        acceptedCount: accepted.length,
        rejectedCount: rejected.length,
        accepted,
        rejected,
      };

      const emailReceiver = req.user.email || "kizomanizo@gmail.com";

      // Send result object via email
      await EmailService.sendEmail({
        to: emailReceiver,
        subject: "UCS Accounts File Upload Completed",
        text: `Hongera, \n Faili lako ulilopakia kwenye mfumo wa UCS limepokelewa na kufanyiwa kazi kikamilifu. Matokeo ya upakiaji huo yameambatanishwa hapa chini.\n`,
        html: `<h1><strong>Hongera!</strong></h1>
          <p>Faili lako ulilopakia kwenye mfumo wa UCS limepokelewa na kufanyiwa kazi kikamilifu.</p>
          <p>Matokeo ya upakiaji huo yameambatanishwa hapa chini.</p>
          <hr>
          <h2>Matokeo ya Upakiaji</h2>
          <p>Jumla ya safu zilizopakiwa: <strong>${result.total}</strong></p>
          <p>Idadi ya safu zilizopokelewa: <strong>${result.acceptedCount}</strong></p>
          <p>Idadi ya safu zilizokataliwa: <strong>${result.rejectedCount}</strong></p>
          <h3>Safu Zilizopokelewa</h3>
          <br>
          ${result.accepted
            .map(
              (row) => `
          <p><strong>Row ${row.rowNumber}:</strong> ${row.firstName} ${row.lastName} (${row.username}) - ${row.ward}</p>
          `
            )
            .join("")}
          <h3>Safu Zilizokataliwa</h3>
          <br>
          ${result.rejected
            .map(
              (row) => `
          <p><strong>Row ${row.rowNumber}:</strong> ${row.firstName} ${row.lastName} (${row.username}) - ${row.ward} - Rejection Reason: ${row.rejectionReason}</p>
          `
            )
            .join("")}
          <hr>
          <h3>Result Object</h3>
          <pre>${JSON.stringify(result, null, 2)}</pre>
          <p>Kwa maelezo zaidi, tafadhali wasiliana na timu ya msaada wa UCS.</p>
          <p>Asante kwa kutumia UCS!</p>`,
      });

      console.log("✅ CSV file processed successfully.");
      return result;
    } catch (error) {
      throw new CustomError("Failed to process CSV file: " + error.stack, 500);
    }
  }

  // Get team members by team UUID
  static async getTeamMembersByTeamUuid(teamUuid) {
    try {
      const teamMembers = await TeamMemberRepository.getTeamMembersByTeamUuid(teamUuid);
      if (!teamMembers || teamMembers.length === 0) {
        throw new CustomError("No team members found for this team.", 404);
      }
      return teamMembers;
    } catch (error) {
      throw new CustomError("Failed to fetch team members by team UUID: " + error.message, 500);
    }
  }
}

export default TeamMemberService;
