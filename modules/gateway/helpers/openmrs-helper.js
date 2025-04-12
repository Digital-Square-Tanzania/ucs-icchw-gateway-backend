import dotenv from "dotenv";
dotenv.config();
import ApiError from "../../../utils/api-error.js";
import openmrsApiClient from "../../../utils/openmrs-api-client.js";
import ExtractDateFromNin from "../../../utils/extract-date-from-nin.js";
import MemberRoleRepository from "../../openmrs/member-role/openmrs-member-role-repository.js";
import GenerateSwahiliPassword from "../../../utils/generate-swahili-password.js";
import TeamRepository from "../../openmrs/team/openmrs-team-repository.js";
import mysqlClient from "../../../utils/mysql-client.js";

class OpenmrsHelper {
  static async createOpenmrsPerson(payload) {
    try {
      // Create a new person and attributes
      const personObject = {};
      personObject.names = [];
      personObject.names.push({
        givenName: payload.message.body[0].firstName,
        middleName: payload.message.body[0].middleName,
        familyName: payload.message.body[0].lastName,
        preferred: true,
        prefix: payload.message.body[0].sex.toLowerCase() === "male" ? "Mr" : "Ms",
      });
      personObject.birthdate = ExtractDateFromNin.extract(payload.message.body[0].NIN);
      personObject.gender = payload.message.body[0].sex.toLowerCase() === "male" ? "M" : "F";

      // Create the person in OpenMRS
      const newPerson = await openmrsApiClient.post("person", personObject);

      // Safely construct attributes
      const personAttributes = [
        {
          attributeType: process.env.NIN_ATTRIBUTE_TYPE_UUID,
          value: payload.message.body[0].NIN,
          label: "NIN",
        },
        {
          attributeType: process.env.EMAIL_ATTRIBUTE_TYPE_UUID,
          value: payload.message.body[0].email,
          label: "Email",
        },
        {
          attributeType: process.env.PHONE_NUMBER_ATTRIBUTE_TYPE_UUID,
          value: payload.message.body[0].phoneNumber,
          label: "Phone Number",
        },
      ];

      // Loop through and add each attribute
      for (const attr of personAttributes) {
        // Validate all attributeType UUIDs exist
        if (!attr.attributeType) {
          throw new ApiError(`Missing environment variable for ${attr.label} attribute type UUID`, 500, 10);
        }

        try {
          const payload = {
            attributeType: attr.attributeType,
            value: attr.value,
          };
          if (!attr.attributeType) {
            throw new ApiError(`Missing attributeType UUID for attribute with value: ${attr.value}`, 500, 10);
          }
          await openmrsApiClient.post(`person/${newPerson.uuid}/attribute`, payload);
          return newPerson;
        } catch (error) {
          console.error(`❌ Failed to add ${attr.label} to person ${newPerson.uuid}:`, error.message);
          console.log("ERROR:", error.message);
          throw new ApiError(`Error saving person ${attr.label} attribute: ${error.message}`, 500, 5);
        }
      }
    } catch (error) {
      throw new ApiError(500, `An error occurred while creating the person: ${error.message}`, 10);
    }
  }

  /**
   * Creates a new OpenMRS user using the provided payload and person object.
   * @param {Object} payload - The payload object containing user details.
   * @param {Object} newPerson - The person object created in OpenMRS.
   * @returns {Promise<Object>} - A promise that resolves to the created user object.
   * @throws {ApiError} - Throws an ApiError if there is an issue with the request.
   */
  static async createOpenmrsUser(payload, newPerson, newPersonId) {
    try {
      const roleUuid = await MemberRoleRepository.getRoleUuidByRoleName(process.env.DEFAULT_ICCHW_ROLE_NAME);
      const userObject = {};
      const phone = payload.message.body[0].phoneNumber;
      const firstName = payload.message.body[0].firstName || "";
      const lastName = payload.message.body[0].lastName || "";

      userObject.username = phone && phone.startsWith("+255") ? phone.replace("+255", "0") : (firstName.substring(0, 2) + lastName.substring(0, 2)).toLowerCase();
      userObject.password = GenerateSwahiliPassword.generate();
      userObject.roles = [roleUuid];
      userObject.person = {};
      userObject.person.uuid = newPerson.uuid;
      userObject.systemId = userObject.username;

      // Create the user in OpenMRS
      const newUser = await openmrsApiClient.post("user", userObject);
      console.log("Incoming Person ID:", newPersonId);

      if (!newUser.id) {
        await mysqlClient.query("USE openmrs");
        console.log("Deleting person with ID:", newPersonId);
        await mysqlClient.query("CALL delete_person(?)", [newPersonId]);
        console.log(`✅ Successfully deleted person with ID: ${newPersonId}`);
        throw new ApiError("User could not be created: Probable duplicate", 400, 5);
      }

      return newUser;
    } catch (error) {
      throw new ApiError(`An error occurred while creating the user: ${error.message}`, 500, 10);
    }
  }

  /**
   * Creates a new team in OpenMRS using the provided location object.
   * @param {Object} location - The location object containing details about the location.
   * @returns {Promise<Object>} - A promise that resolves to the created team object.
   * @throws {CustomError} - Throws a CustomError if there is an issue with the request.
   */
  static async createOpenmrsTeam(location) {
    try {
      const teamObject = {};
      const teamName = location.name + " - " + location.hfrCode + " - Team";
      const teamIdentifier = (location.name + "-" + location.hfrCode + "-Team").replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
      teamObject.location = location.uuid;
      teamObject.teamName = teamName;
      teamObject.teamIdentifier = teamIdentifier;

      // Send the request to OpenMRS server using OpenMRS API Client
      const newTeam = await openmrsApiClient.post("team/team", teamObject);

      // Save the returned object as a new team in the database
      await TeamRepository.upsertTeam(newTeam);
    } catch (error) {
      await mysqlClient.query("USE openmrs");
      console.log("Deleting person with ID:", newPerson.id);
      await mysqlClient.query("CALL delete_person(?)", [newPerson.id]);
      console.log(`✅ Successfully deleted person with ID: ${newPerson.id}`);
      x;
      // Handle the error and throw a CustomError
      throw new ApiError(error.message, error.statusCode, 10);
    }
  }
}

export default OpenmrsHelper;
