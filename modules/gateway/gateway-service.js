import CustomError from "../../utils/custom-error.js";
import ApiError from "../../utils/api-error.js";
import GatewayRepository from "./gateway-repository.js";
import openSRPApiClient from "../gateway/opensrp-api-client.js";
import dotenv from "dotenv";
import GatewayValidator from "./gateway-validator.js";
import OpenMRSLocationRepository from "../openmrs/location/openmrs-location-repository.js";
import TeamRepository from "../openmrs/team/openmrs-openmrs-team-repository.js";
import openmrsApiClient from "../openmrs/openmrs-api-client.js";
import TeamMemberRepository from "../openmrs/team-member/openmrs-team-member-repository.js";
import MemberRoleRepository from "../openmrs/member-role/openmrs-member-role-repository.js";
import TeamRoleRepository from "../openmrs/team-role/openmrs-team-role-repository.js";
import EmailService from "../../utils/email-service.js";

dotenv.config();

class GatewayService {
  /*
   * Get team members by location HFR code
   */
  static async getTeamMemberByLocationHfrCode(hfrCode) {
    return await GatewayRepository.getTeamMembersByLocationHfrCode(hfrCode);
  }

  /*
   * Get CHW monthly activity status
   */
  static async getStatuses(month, year, teamMembers) {
    try {
      // Validate month and year
      GatewayValidator.validateMonthAndYear(month, year);

      // Prepare payload for OpenSRP request
      const opensrpRequestPyload = {
        period: {
          month: month,
          year: year,
        },
        chws: teamMembers,
      };

      // Fetch team member statys from OpenSRP
      const chwMonthlyStatusResponse = await openSRPApiClient.post("/chw/monthly-status", opensrpRequestPyload);

      if (chwMonthlyStatusResponse.length === 0) {
        throw new CustomError("CHW monthly activity statistics not found.", 404);
      }

      return chwMonthlyStatusResponse;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode);
    }
  }

  /*
   * Generate message ID
   */
  static async generateMessageId() {
    const now = new Date();

    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const SSS = String(now.getMilliseconds()).padStart(3, "0");

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}${SSS}`;
  }

  static async getChwMonthlyStatus(req, res, next) {
    const { header, body } = req.body.message;
    const signature = req.body.signature;
    const hfrCode = body.FacilityCode;
    const teamMembers = await this.getTeamMemberByLocationHfrCode(hfrCode);

    if (!teamMembers) {
      throw new CustomError("CHW monthly activity statistics not found.", 404);
    }

    const month = body.month;
    const year = body.year;

    console.log("🔄 Getting monthly status for team members...");
    const payload = await this.getStatuses(month, year, teamMembers);
    console.log("✅ Statuses obtained and sent!");
    return payload;
  }

  /*
   * Register new CHW from HRHIS
   */
  static async registerChwFromHrhis(req, _res, _next) {
    console.log("🔄 Registering CHW from HRHIS...");
    try {
      const payload = req.body;

      // Validate incoming CHW deployment payload
      GatewayValidator.validateChwDemographics(payload);

      // Check if the CHW exists in team members by NIN
      const teamMember = await TeamMemberRepository.getTeamMemberByNin(payload.message.body[0].NIN);

      if (teamMember) {
        throw new ApiError("Duplicate CHW ID found.", 409, 2);
      }

      // Check if the location exists
      const location = await OpenMRSLocationRepository.getLocationByHfrCode(payload.message.body[0].hfrCode);
      if (!location) {
        throw new ApiError("Invalid locationCode or locationType.", 404, 4);
      }

      // Check if a team exists without location
      const team = await TeamRepository.getTeamByLocationUuid(location.uuid);

      if (!team) {
        // Do not throw error here, create team
        const teamObject = {};
        const teamName = location.name + " - " + location.hfrCode + " - Team";
        const teamIdentifier = (location.name + " - " + location.hfrCode + " - Team").replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
        teamObject.location = location.uuid;
        teamObject.teamName = teamName;
        teamObject.teamIdentifier = teamIdentifier;

        // Send the request to OpenMRS server using OpenMRS API Client
        const newTeam = await openmrsApiClient.post("team/team", teamObject);

        // Save the returned object as a new team in the database
        await TeamRepository.upsertTeam(newTeam);
      }

      // Create a new person if team member does not exist by NIN
      const personObject = {};
      personObject.names = [];
      personObject.names.push({
        givenName: payload.message.body[0].firstName,
        middleName: payload.message.body[0].middleName,
        familyName: payload.message.body[0].lastName,
        preferred: true,
        prefix: payload.message.body[0].sex.toLowerCase() === "male" ? "Mr" : "Ms",
      });
      personObject.birthdate = this.extractDateFromNIN(payload.message.body[0].NIN);
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

      // Validate all attributeType UUIDs exist
      for (const attr of personAttributes) {
        if (!attr.attributeType) {
          throw new ApiError(`Missing environment variable for ${attr.label} attribute type UUID`, 500, 10);
        }
      }

      // Loop through and add each attribute
      for (const attr of personAttributes) {
        try {
          const payload = {
            attributeType: attr.attributeType,
            value: attr.value,
          };
          if (!attr.attributeType) {
            throw new ApiError(`Missing attributeType UUID for attribute with value: ${attr.value}`, 500, 10);
          }
          await openmrsApiClient.post(`person/${newPerson.uuid}/attribute`, payload);
        } catch (error) {
          console.error(`❌ Failed to add ${attr.label} to person ${newPerson.uuid}:`, error.message);
          throw new ApiError(`Error saving person ${attr.label} attribute: ${error.message}`, 500, 5);
        }
      }

      // Create a new OpenMRS user
      const roleUuid = await MemberRoleRepository.getRoleUuidByRoleName("iCCHW");
      const userObject = {};
      userObject.username = payload.message.body[0].phoneNumber.replace("+255", "0");
      userObject.password = this.generateSwahiliPassword();
      userObject.roles = [roleUuid];
      userObject.person = {};
      userObject.person.uuid = newPerson.uuid;
      userObject.systemId = userObject.username;

      // Create the user in OpenMRS
      const newUser = await openmrsApiClient.post("user", userObject);

      if (!newUser) {
        throw new ApiError(`User could not be created: +${error.message}`, 400, 3);
      }

      // Create a new team member in OpenMRS
      const identifierRole = await TeamRoleRepository.getTeamRoleUuidByIdentifier("waja");
      const teamMemberObject = {
        identifier: newUser.username + location.hfrCode.replace("-", ""),
        locations: [
          {
            uuid: location.uuid,
          },
        ],
        joinDate: new Date().toISOString().split("T")[0],
        team: {
          uuid: team.uuid,
        },
        teamRole: {
          uuid: identifierRole.uuid,
        },
        person: {
          uuid: newPerson.uuid,
        },
        isDataProvider: "false",
      };

      // Create the team member in OpenMRS
      const newTeamMember = await openmrsApiClient.post("team/teammember", teamMemberObject);

      const newTeamMemberDetails = await openmrsApiClient.get(`team/teammember/${newTeamMember.uuid}`, {
        v: "custom:(uuid,identifier,dateCreated,teamRole,person:(uuid,attributes:(uuid,display,value,attributeType:(uuid,display)),preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
      });

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
        username: newUser.username,
        userUuid: newUser.uuid,
        personUuid: newTeamMemberDetails.person?.uuid,
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
      const localTeamMember = await TeamMemberRepository.upsertTeamMember(formattedMember);
      console.log("✅ CHW from HRHIS registered successfuly.");

      // Send email to the CHW with their login credentials
      const emailData = {
        to: formattedMember.email,
        subject: "iCCHW Account Activation",
      };

      await EmailService.sendEmail({
        to: formattedMember.email,
        subject: "Kufungua Akaunti ya UCS/WAJA",
        text: `Hongera, umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kufungua akaunti yako ili uweze kutumia kishkwambi(Tablet) cha kazi: https://ucs.moh.go.tz/user-management/activation?username=${formattedMember.username}`,
        html: `<h1><strong>Hongera!</strong></h1> <p>Umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kuhuisha akaunti yako ili uweze kutumia kishkwambi(Tablet) chako.</p>
           <p><a href="https://ucs.moh.go.tz/user-management/activation?username=${formattedMember.username}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Fungua Akaunti</a></p>`,
      });

      return "Facility and personnel details processed successfully.";
    } catch (error) {
      // Rethrow with CustomError for the controller to catch
      throw new CustomError(error.message, error.statusCode || 400);
    }
  }

  /*
   * Update CHW demographics from HRHIS
   */
  static async updateChwDemographics(req, _res, _next) {
    try {
      const payload = req.body;

      // ✅ Validate the payload
      GatewayValidator.validateChwDemographicUpdate(payload);

      // Normalize to array if single object is provided
      const chwUpdates = Array.isArray(payload.message.body) ? payload.message.body : [payload.message.body];

      const results = [];

      for (const chw of chwUpdates) {
        const teamMember = await TeamMemberRepository.getTeamMemberByNin(chw.NIN);

        if (!teamMember || !teamMember.openMrsUuid) {
          throw new ApiError(`CHW with NIN ${chw.NIN} not found in UCS.`, 404, 6);
        }

        // Get full team member info to access person uuid
        const teamMemberDetails = await openmrsApiClient.get(`team/teammember/${teamMember.openMrsUuid}`, {
          v: "custom:(uuid,person:(uuid))",
        });

        const personUuid = teamMemberDetails.person?.uuid;
        if (!personUuid) {
          throw new ApiError(`Person UUID not found for NIN ${chw.NIN}`, 400, 7);
        }

        // Fetch the full person details to fallback missing values
        const existingPerson = await openmrsApiClient.get(`person/${personUuid}`, {
          v: "full",
        });

        const personUpdatePayload = {};
        const updatedFields = [];

        // ✅ Gender
        if (chw.sex && (chw.sex.toUpperCase() === "MALE" || chw.sex.toUpperCase() === "FEMALE")) {
          const gender = chw.sex.toUpperCase() === "MALE" ? "M" : "F";
          if (gender !== existingPerson.gender) {
            personUpdatePayload.gender = gender;
            updatedFields.push("sex");
          }
        }

        // ✅ Names
        const existingName = existingPerson.preferredName || {};
        const nameUpdate = {};
        const nameFieldsChanged = {};

        if (chw.firstName && chw.firstName !== existingName.givenName) {
          nameUpdate.givenName = chw.firstName;
          nameFieldsChanged.firstName = true;
        }
        if (chw.middleName !== undefined && chw.middleName !== existingName.middleName) {
          nameUpdate.middleName = chw.middleName;
          nameFieldsChanged.middleName = true;
        }
        if (chw.lastName && chw.lastName !== existingName.familyName) {
          nameUpdate.familyName = chw.lastName;
          nameFieldsChanged.lastName = true;
        }

        if (Object.keys(nameFieldsChanged).length > 0) {
          // Ensure required values are always present
          nameUpdate.givenName = nameUpdate.givenName || existingName.givenName || "";
          nameUpdate.middleName = nameUpdate.middleName !== undefined ? nameUpdate.middleName : existingName.middleName || null;
          nameUpdate.familyName = nameUpdate.familyName || existingName.familyName || "";

          personUpdatePayload.names = [nameUpdate];

          updatedFields.push(...Object.keys(nameFieldsChanged));
        }

        // 🧠 Only update if there is something to update
        if (Object.keys(personUpdatePayload).length > 0) {
          await openmrsApiClient.post(`person/${personUuid}`, personUpdatePayload);
          results.push({
            message: "CHW demographic updated.",
            nin: chw.NIN,
            personUuid,
            updatedFields,
          });
        } else {
          results.push({
            message: "No changes detected for CHW.",
            nin: chw.NIN,
            personUuid,
            updatedFields: [],
          });
        }
      }

      console.log("✅ CHW demographic updates processed.");
      return results;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode || 400);
    }
  }

  /*
   * Extract date from NIN
   */
  static extractDateFromNIN(nin) {
    // Ensure NIN is in the expected format
    const match = nin.match(/^(\d{8})-\d{5}-\d{5}-\d{2}$/);
    if (!match) {
      throw new ApiError("Invalid NIN format", 400, 3);
    }

    const birthSegment = match[1]; // "19570716"
    const year = birthSegment.slice(0, 4);
    const month = birthSegment.slice(4, 6);
    const day = birthSegment.slice(6, 8);

    return `${year}-${month}-${day}`;
  }

  /*
   * Random password generator
   */
  static generateRandomPassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  /*
   * Swahili password generator
   */
  static generateSwahiliPassword() {
    const rawWords = process.env.SWAHILI_WORDS || "";
    const swahiliWords = rawWords
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    const getRandomWord = () => {
      const word = swahiliWords[Math.floor(Math.random() * swahiliWords.length)];
      return word.charAt(0).toUpperCase() + word.slice(1);
    };

    const word1 = getRandomWord();
    const word2 = getRandomWord();
    const number = Math.floor(100 + Math.random() * 900); // 3-digit number

    return `${word1}${word2}${number}`;
  }

  /*
   * Generate HRHIS Response Parts
   */

  static async generateHrhisReponseParts(req) {
    const header = req.body.message.header;
    const signature = req.body.signature;
    const responseHeader = {};
    responseHeader.sender = header.receiver;
    responseHeader.receiver = header.sender;
    responseHeader.messageType = header.messageType.endsWith("_REQUEST") ? header.messageType.replace("_REQUEST", "_RESPONSE") : header.messageType + "_RESPONSE";
    responseHeader.messageId = this.generateMessageId;
    responseHeader.createdAt = new Date().toISOString();
    const responseObject = {};
    responseObject.header = responseHeader;
    responseObject.signature = signature;
    return responseObject;
  }
}

export default GatewayService;
