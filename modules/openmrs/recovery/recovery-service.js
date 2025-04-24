import dotenv from "dotenv";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import RecoveryRepository from "./recovery-repository.js";
import CustomError from "../../../utils/custom-error.js";
import TeamMemberService from "../team-member/openmrs-team-member-service.js";
import postgresClient from "../../../utils/postgres-client.js";
import prisma from "../../../config/prisma.js";
import pLimit from "p-limit";
import TeamMemberRepository from "../team-member/openmrs-team-member-repository.js";

dotenv.config();

class RecoveryService {
  // Add records from UCS Master file into OpenMRS
  static async addPeopleInOpenmrs() {
    console.log("🔄 Adding people in OpenMRS...");
    let totalAdded = 0;
    let totalFailed = 0;
    let failedRecords = [];
    let successRecords = [];

    try {
      const recoveredAccounts = await RecoveryRepository.getPendingRecoveredAccounts();
      if (!recoveredAccounts || recoveredAccounts.length === 0) {
        console.log("No people found in the local database.");
        throw new CustomError("No people found in the local database.", 404);
      }

      const limit = pLimit(Number(process.env.P_LIMIT_CONCURRENCY) || 5); // Concurrency tuning
      const results = await Promise.allSettled(recoveredAccounts.map((account) => limit(() => this.processAccount(account))));

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          totalAdded++;
          successRecords.push({ personId: result.value.personId });
        } else {
          totalFailed++;
          failedRecords.push({
            personId: result.value?.personId || null,
            reason: result.reason?.message || result.value?.reason || "Unknown error",
          });
        }
      }

      console.log(`✅ ${totalAdded} People recovered successfully in OpenMRS.`);
      return {
        totalAdded,
        totalFailed,
        successRecords,
        failedRecords,
      };
    } catch (error) {
      console.error("Error in addPeopleInOpenmrs:", error);
      throw new CustomError("Error adding people in OpenMRS: " + error.message, 500);
    }
  }

  static async recoverMissingAccounts(doInsert = true) {
    try {
      // 1. Get team members from OpenSRP
      const teamMembers = await postgresClient.query(`
        SELECT identifier, location_uuid, team_name, name
        FROM public.team_members
        WHERE date_deleted IS NULL
      `);

      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        return { inserted: 0, skipped: 0 };
      }

      // 2. Get all UCS master entries
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

      // 3. Create fast lookup map
      const masterMap = new Map();
      ucsMaster.forEach((u) => {
        if (u.username) masterMap.set(u.username.trim().toLowerCase(), u);
      });

      // 4. Build recovered accounts
      const recoveredAccounts = teamMembers.map((member) => {
        const identifier = member.identifier?.trim().toLowerCase();
        const matched = masterMap.get(identifier);

        return {
          recoveredName: member.name || null,
          firstName: matched?.firstName || null,
          middleName: matched?.middleName || null,
          familyName: matched?.familyName || null,
          dob: new Date("1950-01-01"),
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
          memberUuid: null,
          errorLog: null,
        };
      });

      if (!doInsert || recoveredAccounts.length === 0) {
        return {
          inserted: 0,
          skipped: 0,
        };
      }

      // 5. Insert via recovery repository
      const insertedCount = await RecoveryRepository.createRecoveredAccounts(recoveredAccounts);

      // 6. Log the results
      if (insertedCount > 0) {
        console.log(`✅ ${insertedCount} accounts recovered successfully.`);
      }
      if (insertedCount === 0) {
        console.log("No accounts were recovered.");
      }
      if (insertedCount < teamMembers.length) {
        console.log(`⚠️ ${teamMembers.length - insertedCount} accounts were skipped.`);
      }
      if (insertedCount > teamMembers.length) {
        console.log(`⚠️ ${insertedCount - teamMembers.length} accounts were inserted but not in the original list.`);
      }
      // 7. Return the result
      return {
        inserted: insertedCount,
        skipped: teamMembers.length - insertedCount,
      };
    } catch (error) {
      console.error("[ERROR] Recovery failed:", error.message);
      throw error;
    }
  }

  static async processAccount(account) {
    let newPerson;
    let step = "initialization";

    try {
      // 1. Create OpenMRS Person
      step = "creating OpenMRS person";
      const personObject = {
        names: [
          {
            givenName: account.firstName,
            middleName: account.middleName,
            familyName: account.familyName,
            preferred: true,
            prefix: account.gender.toLowerCase() === "male" ? "Mr" : "Ms",
          },
        ],
        birthdate: "1950-01-01",
        gender: account.gender.toLowerCase() === "male" ? "M" : "F",
      };

      newPerson = await openmrsApiClient.post("person", personObject);
      if (!newPerson.uuid) throw new Error("Failed to create OpenMRS person");

      const newPersonWithId = await openmrsApiClient.get(`person/${newPerson.uuid}?v=custom:(id,uuid)`);
      newPerson = newPersonWithId;

      step = "updating person in local DB";
      const updatePerson = await RecoveryRepository.updateOpenmrsPerson(account.id, {
        personId: newPerson.id,
        personUuid: newPerson.uuid,
      });
      if (!updatePerson.personUuid) throw new Error("Failed to update person locally");

      // 2. Create OpenMRS User
      step = "creating OpenMRS user";
      let password = updatePerson.password;
      if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
        password += "1Ucs";
      }

      const userObject = {
        username: updatePerson.username,
        password,
        roles: [{ uuid: process.env.UCS_PROD_PROVIDER_ROLE_UUID }],
        person: { uuid: updatePerson.personUuid },
        systemId: updatePerson.username,
      };

      const newUser = await openmrsApiClient.post("user", userObject);
      if (!newUser.uuid) throw new Error("Failed to create OpenMRS user");

      const newUserWithId = await openmrsApiClient.get(`user/${newUser.uuid}?v=custom:(id,uuid)`);

      step = "updating user in local DB";
      const updateUser = await RecoveryRepository.updateOpenmrsPersonById(updatePerson.id, {
        userId: newUserWithId.id,
        userUuid: newUserWithId.uuid,
      });

      // 3. Fetch OpenSRP location data
      step = "fetching OpenSRP location data";
      const opensrpDataQuery = await postgresClient.query(
        "SELECT DISTINCT tm.*, em.team_id AS team_uuid FROM public.team_members tm JOIN core.event_metadata em ON tm.identifier = em.provider_id WHERE em.team_id IS NOT NULL AND tm.identifier = $1",
        [updateUser.username]
      );

      const opensrpData = opensrpDataQuery[0];
      if (!opensrpData?.location_uuid) throw new Error("Missing OpenSRP location UUID");

      step = "updating location in local DB";
      await RecoveryRepository.updateOpenmrsPersonById(updateUser.id, {
        locationUuid: opensrpData.location_uuid,
        locationName: opensrpData.location_name,
        teamName: opensrpData.team_name,
        teamUuid: opensrpData.team_uuid,
      });

      // 4. Get or create OpenMRS team
      step = "checking OpenMRS team";
      let openmrsTeam = await openmrsApiClient.get(`team/team/${opensrpData.team_uuid}?v=custom:(id,uuid,teamName,location:(id,uuid,name))`);
      if (!openmrsTeam?.uuid) {
        step = "creating OpenMRS team";
        const teamObject = {
          teamName: opensrpData.team_name,
          location: opensrpData.location_uuid,
          uuid: opensrpData.team_uuid,
          teamIdentifier: opensrpData.team_name.replace(/[-\s]/g, "").toLowerCase(),
        };
        openmrsTeam = await openmrsApiClient.post("team/team", teamObject);
      }

      if (!openmrsTeam.location?.uuid) throw new Error("OpenMRS team missing location");

      // 5. Create OpenMRS team member
      step = "creating team member in OpenMRS";
      const teamMemberObject = {
        identifier: updateUser.username,
        locations: [{ uuid: openmrsTeam.location.uuid }],
        joinDate: new Date().toISOString().split("T")[0],
        team: { uuid: openmrsTeam.uuid },
        teamRole: { uuid: process.env.UCS_PROVIDER_TEAM_ROLE_UUID },
        person: { uuid: updateUser.personUuid },
        isDataProvider: "false",
      };

      const newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);
      const newTeamMemberWithId = await openmrsApiClient.get(`team/teammember/${newTeamMember.uuid}?v=custom:(id,uuid)`);

      step = "updating team member in local DB";
      await RecoveryRepository.updateOpenmrsPersonById(updateUser.id, {
        memberId: newTeamMemberWithId.id,
        memberUuid: newTeamMemberWithId.uuid,
        memberIdentifier: updateUser.username,
        teamRoleId: 1,
        locationId: openmrsTeam.location.id,
        teamRole: "UCS Provider",
        teamId: openmrsTeam.id,
      });

      // 6. Upsert into Postgres team_members
      step = "upserting into Postgres team_member table";
      const teamMember = {
        openMrsUuid: newTeamMemberWithId.uuid,
        firstName: account.firstName,
        middleName: account.middleName,
        lastName: account.familyName,
        personUuid: updateUser.personUuid,
        username: updateUser.username,
        userUuid: updateUser.userUuid || null,
        teamUuid: opensrpData.team_uuid,
        teamName: opensrpData.team_name,
        teamIdentifier: opensrpData.team_name.replace(/[-\s]/g, "").toLowerCase(),
        locationUuid: openmrsTeam.location.uuid,
        locationName: openmrsTeam.location.name,
        locationDescription: "",
        updatedAt: new Date(),
        identifier: updateUser.username,
        roleName: "UCS Provider",
        roleUuid: process.env.UCS_PROVIDER_TEAM_ROLE_UUID,
      };

      await TeamMemberRepository.upsertTeamMember(teamMember);

      console.log(`✅ Successfully recovered person ${account.id} (${account.firstName} ${account.familyName}) in OpenMRS`);

      await RecoveryRepository.updateOpenmrsPersonById(account.id, {
        errorLog: "SUCCESS: OpenMRS recovery completed",
        recovery_status: "COMPLETED",
        recovery_date: new Date(),
      });

      return { success: true, personId: account.id };
    } catch (err) {
      console.error(`❌ Error during ${step}:`, err.message);

      // Only delete if the error happened before creating team member
      if (["creating OpenMRS person", "creating OpenMRS user", "updating person in local DB"].includes(step)) {
        if (newPerson?.id) {
          await TeamMemberService.deletePerson(newPerson.id);
          console.log(`Rolled back person with ID ${newPerson.id}`);
        }
      }

      await RecoveryRepository.updateOpenmrsPersonById(account.id, {
        errorLog: `Step: ${step} | ${err.message}`,
        recovery_status: "FAILED",
      });

      return { success: false, personId: account.id, reason: `Step: ${step} | ${err.message}` };
    }
  }
}

export default RecoveryService;
