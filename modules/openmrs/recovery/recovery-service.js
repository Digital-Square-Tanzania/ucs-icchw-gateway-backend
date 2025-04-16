import dotenv from "dotenv";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import RecoveryRepository from "./recovery-repository.js";
import CustomError from "../../../utils/custom-error.js";
import TeamMemberService from "../team-member/openmrs-team-member-service.js";
import postgresClient from "../../../utils/postgres-client.js";

dotenv.config();

class RecoveryService {
  // Register new CHW from HRHIS
  static async addPeopleInOpenmrs(req, _res, _next) {
    console.log("🔄 Adding people in OpenMRS...");
    let newPerson = null;
    let totalAdded = 0;
    let totalFailed = 0;
    try {
      // Get people fron our local database ucs_master table
      const existingPeople = await RecoveryRepository.getAllUcsMasterPeople();
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

        console.log("Person Object:", personObject);
        personObject.gender = person.gender.toLowerCase() === "male" ? "M" : "F";

        // Create the person in OpenMRS
        newPerson = await openmrsApiClient.post("person", personObject);

        if (!newPerson.uuid) {
          totalFailed++;
          console.error("Error creating OpenMRS person:", newPerson.error);
          return;
        }

        // Get the newly created person id and uuid
        const newPersonWithId = await openmrsApiClient.get(`person/${newPerson.uuid}?v=custom:(id,uuid)`);

        console.log("New Person with ID:", newPersonWithId);

        newPerson = newPersonWithId;

        // Update the local database with the OpenMRS id and uuid
        const updatePerson = await RecoveryRepository.updateOpenmrsPerson(person.id, {
          personId: newPerson.id,
          personUuid: newPerson.uuid,
        });

        if (!updatePerson.personUuid) {
          TeamMemberService.deletePerson(newPerson.id);
          console.error("Error updating OpenMRS person:", updatePerson.error);
          return;
        }
        console.log("Successfully updated local OpenMRS person:", updatePerson.personUuid);

        // Create OpenMRS user
        const userObject = {
          username: updatePerson.username,
          password: updatePerson.password,
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
          console.error("Error creating OpenMRS user: " + newUser.error);
          throw new CustomError("Error creating OpenMRS user.", 500);
        }
        console.log("Successfully created OpenMRS user:", newUser.uuid);
        // Get the newly created user id and uuid
        const newUserWithId = await openmrsApiClient.get(`user/${newUser.uuid}?v=custom:(id,uuid)`);
        newUser = newUserWithId;
        // Update the local database with the OpenMRS user id and uuid
        const updateUser = await RecoveryRepository.updateOpenmrsPersonById(updatePerson.id, {
          userId: newUser.id,
          userUuid: newUser.uuid,
        });
        if (!updateUser) {
          throw new CustomError("Error updating OpenMRS user.", 500);
        }
        console.log("Successfully updated Local OpenMRS user:", updateUser.userUuid);

        // Fetch location UUIDs ny username (identifier) from OpenSRP team_member table
        const locationUuid = await postgresClient.query("SELECT location_uuid FROM team_member WHERE username = $1", [updatePerson.username]);
        if (!locationUuid || locationUuid.length === 0) {
          TeamMemberService.deletePerson(updatePerson.personId);
          totalFailed++;
          console.error("Error fetching location UUID:", locationUuid);
          return;
        }
        console.log("Successfully fetched location UUID:", locationUuid[0].location_uuid);

        totalAdded++;
      }
      console.log("✅ People added successfully in OpenMRS");
      var response = {
        totalAdded: totalAdded,
        totalFailed: totalFailed,
      };
      return response;
    } catch (error) {
      console.error("Error in addPeopleInOpenmrs:", error.stack);
      throw new CustomError("Error adding people in OpenMRS: " + error.message, 500);
    }
  }
}

export default RecoveryService;
