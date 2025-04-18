import dotenv from "dotenv";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import RecoveryRepository from "./recovery-repository.js";
import CustomError from "../../../utils/custom-error.js";
import TeamMemberService from "../team-member/openmrs-team-member-service.js";
import postgresClient from "../../../utils/postgres-client.js";
import prisma from "../../../config/prisma.js";

dotenv.config();

class RecoveryService {
  // Add records from UCS Master file into OpenMRS
  static async addPeopleInOpenmrs() {
    console.log("🔄 Adding people in OpenMRS...");
    let newPerson = null;
    let totalAdded = 0;
    let totalFailed = 0;
    let failedRecords = [];
    let successRecords = [];
    try {
      // Get people fron our local database ucs_master table
      const existingPeople = await RecoveryRepository.getAllUcsMasterPeople();
      // const existingPeople = await this.checkAvailableTeamsInOpenmrs();
      if (!existingPeople || existingPeople.length === 0) {
        console.log("No people found in the local database.");
        throw new CustomError("No people found in the local database.", 404);
      }
      // Loop through each person and add them to OpenMRS
      for (const person of existingPeople) {
        const personObject = {};
        personObject.names = [];
        personObject.names.push({
          givenName: person.firstName,
          middleName: person.middleName,
          familyName: person.familyName,
          preferred: true,
          prefix: person.gender.toLowerCase() === "male" ? "Mr" : "Ms",
        });
        const dob = new Date(person.dob);
        personObject.birthdate = `${dob.getFullYear()}-${(dob.getMonth() + 1).toString().padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;

        personObject.gender = person.gender.toLowerCase() === "male" ? "M" : "F";

        // Create the person in OpenMRS
        newPerson = await openmrsApiClient.post("person", personObject);

        if (!newPerson.uuid) {
          totalFailed++;
          failedRecords.push({ personId: person.id });
          console.error("Error creating OpenMRS person:", JSON.stringify(newPerson.response.data.error.message, null, 2));
          continue;
        }

        // Get the newly created person id and uuid
        const newPersonWithId = await openmrsApiClient.get(`person/${newPerson.uuid}?v=custom:(id,uuid)`);

        newPerson = newPersonWithId;

        // Update the local database with the OpenMRS id and uuid
        const updatePerson = await RecoveryRepository.updateOpenmrsPerson(person.id, {
          personId: newPerson.id,
          personUuid: newPerson.uuid,
        });

        if (!updatePerson.personUuid) {
          TeamMemberService.deletePerson(newPerson.id);
          console.error("Error updating OpenMRS person:", JSON.stringify(updatePerson.response.data.error.message));
          totalFailed++;
          failedRecords.push({ personId: person.id });
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: updatePerson.response.data.error.message,
          });
          continue;
        }

        // Create OpenMRS user
        let password = updatePerson.password;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        if (password.length < 8 || !hasLower || !hasUpper) {
          password += "1Ucs";
        }
        const userObject = {
          username: updatePerson.username,
          password: password,
          roles: [
            {
              uuid: process.env.UCS_PROD_PROVIDER_ROLE_UUID,
            },
          ],
          person: {
            uuid: updatePerson.personUuid,
          },
          systemId: updatePerson.username,
        };
        let newUser = null;
        newUser = await openmrsApiClient.post("user", userObject);
        if (!newUser.uuid) {
          TeamMemberService.deletePerson(newPerson.id);
          totalFailed++;
          failedRecords.push({ personId: person.id });
          console.error("Error creating OpenMRS user: " + JSON.stringify(newUser.response.data.error.message));
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: newUser.response.data.error.message,
          });
          throw new CustomError("Error creating OpenMRS user: ", 500);
        }

        // Get the newly created user id and uuid
        const newUserWithId = await openmrsApiClient.get(`user/${newUser.uuid}?v=custom:(id,uuid)`);
        newUser = newUserWithId;

        // Update the local database with the OpenMRS user id and uuid
        const updateUser = await RecoveryRepository.updateOpenmrsPersonById(updatePerson.id, {
          userId: newUser.id,
          userUuid: newUser.uuid,
        });
        if (updateUser.error) {
          totalFailed++;
          failedRecords.push({ personId: person.id });
          TeamMemberService.deletePerson(newPerson.id);
          console.error("Error updating OpenMRS user for person:", updatePerson.personUuid);
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Error updating OpenMRS user for person: ${updatePerson.personUuid}`,
          });
          continue;
        }

        // Fetch location UUIDs ny username (identifier) from OpenSRP team_member table
        let opensrpData;
        try {
          // Deprecated query to get the location UUID
          // opensrpData = await postgresClient.query(
          //   "SELECT * FROM public.team_members tm INNER JOIN (SELECT DISTINCT team_id AS team_uuid, team AS team_name FROM core.event_metadata) t1 using (team_name) WHERE tm.identifier = $1",
          //   [updatePerson.username]
          // );

          // A faster query to get the location UUID

          opensrpData = await postgresClient.query(
            "SELECT DISTINCT tm.*, em.team_id AS team_uuid FROM public.team_members tm JOIN core.event_metadata em ON tm.team_name = em.team WHERE tm.identifier = $1",
            [updatePerson.username]
          );
        } catch (error) {
          console.error("Error fetching location UUID:", error.message);
          TeamMemberService.deletePerson(updatePerson.personId);
          totalFailed++;
          failedRecords.push({ personId: person.id });
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Error fetching location UUID: ${error.message}`,
          });
          continue;
        }

        if (!opensrpData || !opensrpData[0] || !opensrpData[0].location_uuid) {
          console.error("OpenSRP data missing location UUID.");
          await TeamMemberService.deletePerson(updateUser.personId);
          totalFailed++;
          failedRecords.push({ personId: newPerson.id });
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `OpenSRP data missing location UUID.`,
          });
          continue;
        }

        await RecoveryRepository.updateOpenmrsPersonById(updateUser.id, {
          locationUuid: opensrpData[0].location_uuid,
          locationName: opensrpData[0].location_name,
          teamName: opensrpData[0].team_name,
          teamUuid: opensrpData[0].team_uuid,
        });

        // Get Team details form OpenMRS, if no team, create one
        let openmrsTeam;
        let newOpenmrsTeamWithId;
        try {
          newOpenmrsTeamWithId = await openmrsApiClient.get(`team/team/${opensrpData[0].team_uuid}?v=custom:(id,uuid,teamName,location:(id,uuid,name))`);
        } catch (err) {
          console.error("Error fetching OpenMRS team:", err.message);
          await TeamMemberService.deletePerson(updateUser.personId);
          totalFailed++;
          failedRecords.push({ personId: newPerson.id });
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Error fetching OpenMRS team:", ${err.message}`,
          });
          continue;
        }

        if (!newOpenmrsTeamWithId || !newOpenmrsTeamWithId.location || !newOpenmrsTeamWithId.location.uuid) {
          console.error("OpenMRS team missing location info.");
          await TeamMemberService.deletePerson(updateUser.personId);
          totalFailed++;
          failedRecords.push({ personId: newPerson.id });
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Openmrs team missing location info.`,
          });
          continue;
        }

        openmrsTeam = newOpenmrsTeamWithId;

        // Create a new team member in OpenMRS using collected details
        const teamMemberObject = {
          identifier: updateUser.username,
          locations: [
            {
              uuid: openmrsTeam.location.uuid,
            },
          ],
          joinDate: new Date().toISOString().split("T")[0],
          team: {
            uuid: openmrsTeam.uuid,
          },
          teamRole: {
            uuid: process.env.UCS_PROVIDER_TEAM_ROLE_UUID,
          },
          person: {
            uuid: updateUser.personUuid,
          },
          isDataProvider: "false",
        };

        let newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);
        if (!newTeamMember.uuid) {
          TeamMemberService.deletePerson(updateUser.personId);
          totalFailed++;
          failedRecords.push({ personId: newPerson.id });
          console.error("Error creating OpenMRS team member:", JSON.stringify(newTeamMember.response.data.error.message));
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Error creating OpenMRS team member.", ${err.message}`,
          });
          continue;
        }

        // Get the newly created team member id and uuid
        const newTeamMemberWithId = await openmrsApiClient.get(`team/teammember/${newTeamMember.uuid}?v=custom:(id,uuid)`);
        newTeamMember = newTeamMemberWithId;

        // Update the local database with the OpenMRS team member id and uuid
        const updateTeamMember = await RecoveryRepository.updateOpenmrsPersonById(updateUser.id, {
          memberId: newTeamMember.id,
          memberUuid: newTeamMember.uuid,
          memberIdentifier: updateUser.username,
          teamRoleId: 1,
          locationId: openmrsTeam.location.id,
          teamRole: "UCS Provider",
          teamId: openmrsTeam.id,
        });
        if (!updateTeamMember) {
          TeamMemberService.deletePerson(updateUser.personId);
          totalFailed++;
          failedRecords.push({ personId: person.id });
          console.error("Error updating OpenMRS team member for person:", updateUser.personUuid);
          await RecoveryRepository.updateOpenmrsPersonById(person.id, {
            errorLog: `Error updating OpenMRS team member for person.", ${err.message}`,
          });
          continue;
        }
        console.log("Successfully updated Local OpenMRS team member:", updateTeamMember.memberUuid);
        totalAdded++;
        successRecords.push({ personId: person.id });
      }

      console.log("✅ People added successfully in OpenMRS");
      var response = {
        totalAdded: totalAdded,
        totalFailed: totalFailed,
        successRecords: successRecords,
        failedRecords: failedRecords,
      };
      return response;
    } catch (error) {
      console.error("Error in addPeopleInOpenmrs:", error.stack);
      throw new CustomError("Error adding people in OpenMRS: " + error.message, 500);
    }
  }

  static async checkAvailableTeamsInOpenmrs() {
    console.log("🔄 Checking available teams in OpenMRS...");
    try {
      const response = await openmrsApiClient.get("team/team");
      const openmrsTeams = response.results || [];

      if (openmrsTeams.length === 0) {
        console.log("No teams found in OpenMRS.");
        throw new CustomError("No teams found in OpenMRS.", 404);
      }

      const ucsMasterPeople = await RecoveryRepository.getAllUcsMasterPeople();
      if (!ucsMasterPeople || ucsMasterPeople.length === 0) {
        console.log("No records found in the local database.");
        throw new CustomError("No records found in the local database.", 404);
      }

      const ucsValidRecords = ucsMasterPeople.filter((team) => openmrsTeams.some((openmrsTeam) => openmrsTeam.name === team.teamName));

      if (ucsValidRecords.length === 0) {
        console.log("No matching teams found in OpenMRS.");
        throw new CustomError("No matching teams found in OpenMRS.", 404);
      }

      return ucsValidRecords;
    } catch (error) {
      console.error("Error in checkAvailableTeamsInOpenmrs:", error.stack);
      throw new CustomError("Error checking available teams in OpenMRS: " + error.message, 500);
    }
  }

  static async recoverMissingAccounts(doInsert = true) {
    try {
      // 1. Get team members from OpenSRP
      // const { rows: teamMembers } = await postgresClient.query(`
      //   SELECT identifier, location_uuid, team_name, name
      //   FROM public.team_members
      //   WHERE date_deleted IS NULL
      // `);

      // console.log("[DEBUG] teamMembers:", teamMembers);

      const teamMembers = await postgresClient.query(`
        SELECT identifier, location_uuid, team_name, name
        FROM public.team_members
        WHERE date_deleted IS NULL
      `);
      console.log("[DEBUG] PG query teamMembers:", result);

      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        return { inserted: 0, skipped: 0 };
      }

      // 2. Get usernames from ucs_master
      const ucsMaster = await prisma.ucsMaster.findMany({
        select: {
          username: true,
          firstName: true,
          middleName: true,
          familyName: true,
          dob: true,
          gender: true,
          password: true,
        },
      });

      const masterMap = new Map();
      ucsMaster.forEach((u) => masterMap.set(u.username, u));

      // 3. Build recovered accounts
      const recoveredAccounts = teamMembers
        .filter((member) => !masterMap.has(member.identifier))
        .map((member) => {
          const matched = masterMap.get(member.identifier);
          return {
            recoveredName: member.name || null,
            firstName: matched?.firstName || null,
            middleName: matched?.middleName || null,
            familyName: matched?.familyName || null,
            dob: matched?.dob || new Date("1950-01-01"),
            gender: matched?.gender || "Male",
            username: member.identifier,
            password: matched?.password || "R3c0v3r3d",
            memberIdentifier: member.identifier,
            teamId: null,
            teamUuid: null,
            teamName: member.team_name || null,
            teamRole: null,
            teamRoleId: null,
            personId: null,
            personUuid: null,
            userRole: "Provider",
            userId: null,
            userUuid: null,
            locationId: null,
            locationUuid: member.location_uuid || null,
            locationName: null,
            memberId: null,
            memberUuid: member.identifier,
            errorLog: null,
          };
        });

      if (!doInsert || recoveredAccounts.length === 0) {
        return {
          inserted: 0,
          skipped: teamMembers.length - recoveredAccounts.length,
        };
      }

      console.log("[DEBUG] recoveredAccounts length:", recoveredAccounts.length);
      console.log("[DEBUG] recoveredAccounts sample:", recoveredAccounts[0]);

      // 4. Insert via your repository
      const insertedCount = await RecoveryRepository.createRecoveredAccounts(recoveredAccounts);

      return {
        inserted: insertedCount,
        skipped: teamMembers.length - insertedCount,
      };
    } catch (error) {
      console.error("[ERROR] Recovery failed:", error.message);
      throw error;
    }
  }
}

export default RecoveryService;
