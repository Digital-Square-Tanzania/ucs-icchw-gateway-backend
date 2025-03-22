import CustomError from "../../utils/custom-error.js";
import GatewayRepository from "./gateway-repository.js";
import openSRPApiClient from "../gateway/opensrp-api-client.js";
import dotenv from "dotenv";
import GatewayValidator from "./gateway-validator.js";
import OpenMRSLocationRepository from "../openmrs/location/openmrs-location-repository.js";
import TeamRepository from "../openmrs/team/openmrs-openmrs-team-repository.js";
import openmrsApiClient from "../openmrs/openmrs-api-client.js";
import TeamMemberRepository from "../openmrs/team-member/openmrs-team-member-repository.js";

dotenv.config();

class GatewayService {
  static async getTeamMemberByLocationHfrCode(hfrCode) {
    return await GatewayRepository.getTeamMembersByLocationHfrCode(hfrCode);
  }

  static async getStatuses(month, year, teamMembers) {
    try {
      const payload = {};

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

      payload.statuses = chwMonthlyStatusResponse;
      payload.messageId = await this.generateMessageId();
      return payload;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode);
    }
  }

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

    console.log("--> Getting monthly status for team members: ");
    const payload = await this.getStatuses(month, year, teamMembers);
    const responseHeader = {};
    responseHeader.sender = header.receiver;
    responseHeader.receiver = header.sender;
    responseHeader.messageType = header.messageType.endsWith("_REQUEST") ? header.messageType.replace("_REQUEST", "_RESPONSE") : header.messageType;
    responseHeader.messageId = payload.messageId;
    responseHeader.createdAt = new Date().toISOString();
    const responseObject = {};
    responseObject.header = responseHeader;
    responseObject.body = payload.statuses;
    responseObject.signature = signature;
    console.log("Statuses obtained and sent: ==>");
    return responseObject;
  }

  /*
   * Register new CHW from HRHIS
   */
  static async registerChwFromHrhis(req, _res, _next) {
    try {
      const payload = req.body;

      // Validate incoming CHW deployment payload
      GatewayValidator.validateChwDemographics(payload);

      // Check if the CHW exists in team members by NIN
      console.log(" --> Checking team members by NIN: ", payload.message.body[0].NIN);
      const teamMember = await TeamMemberRepository.getTeamMemberByNin(payload.message.body[0].NIN);
      console.log(" ==> Team member found: ");

      if (teamMember) {
        throw new CustomError("CHW already registered.", 409);
      }
      // @TODO: Send Duplicate Error back to HRHIS

      // Check if the location exists
      console.log(" --> Checking location by HFR Code: ", payload.message.body[0].hfrCode);
      const location = await OpenMRSLocationRepository.getLocationByHfrCode(payload.message.body[0].hfrCode);
      if (!location) {
        throw new CustomError("Location not found.", 404);
      }
      console.log(" ==> Location found: ");

      // Check if a team exists without location
      console.log(" --> Checking teams with this location UUID: ", location.uuid);
      const team = await TeamRepository.getTeamByLocationUuid(location.uuid);
      console.log(" ==> Team found:");

      if (!team) {
        // Do not throw error here, create team
        console.log(" --> Creating team with location UUID: ", location.uuid);
        const teamObject = {};
        const teamName = location.name + " - " + location.hfrCode + " - Team";
        const teamIdentifier = (location.name + " - " + location.hfrCode + " - Team").replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
        teamObject.location = location.uuid;
        teamObject.teamName = teamName;
        teamObject.teamIdentifier = teamIdentifier;
        console.log(" ==> Team Created --> ");

        // Send the request to OpenMRS server using OpenMRS API Client
        console.log(" --> Creating team with teamObject:  ");
        const newTeam = await openmrsApiClient.post("team/team", teamObject);
        console.log(" ==> TEAM CREATED: ");

        // Save the returned object as a new team in the database
        console.log(" --> SAVING TEAM: ");
        const localTeam = await TeamRepository.upsertTeam(newTeam);
        console.log(" ==> TEAM SAVED: ");

        return localTeam;
      }
      // return team;

      // Create a new person if team member does not exist by NIN
      console.log(" --> Creating person: ");
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
      console.log(" ==> Person Created: ");

      // return personObject;
      console.log(" --> Creating person with personObject: ");
      const newPerson = await openmrsApiClient.post("person", personObject);
      console.log(" ==> PERSON CREATED: ");

      return newPerson;
    } catch (error) {
      // Rethrow with CustomError for the controller to catch
      throw new CustomError(error.message, error.statusCode || 400);
    }
  }

  static extractDateFromNIN(nin) {
    // Ensure NIN is in the expected format
    const match = nin.match(/^(\d{8})-\d{5}-\d{5}-\d{2}$/);
    if (!match) {
      throw new Error("Invalid NIN format");
    }

    const birthSegment = match[1]; // "19570716"
    const year = birthSegment.slice(0, 4);
    const month = birthSegment.slice(4, 6);
    const day = birthSegment.slice(6, 8);

    return `${year}-${month}-${day}`;
  }
}

export default GatewayService;
