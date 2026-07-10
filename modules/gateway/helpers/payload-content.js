import GatewayValidator from "../gateway-validator.js";
import TeamRepository from "../../openmrs/team/openmrs-team-repository.js";
import TeamMemberRepository from "../../openmrs/team-member/openmrs-team-member-repository.js";
import OpenMRSLocationRepository from "../../openmrs/location/openmrs-location-repository.js";
import OpenmrsHelper from "./openmrs-helper.js";
import LocationResolver from "./location-resolver.js";
import ApiError from "../../../utils/api-error.js";

class PayloadContent {
  constructor(payload) {
    this.payload = payload;
  }

  /**
   * @param {Object} payload - The payload object to validate
   * @description Validates the payload for CHW deployment
   * @throws {ApiError} If the payload is invalid
   * @returns {Promise<TeamMemberLocation>}
   */
  async validate() {
    try {
      const { payload } = this;

      // Validate incoming CHW deployment payload
      GatewayValidator.validateChwDemographics(payload);

      // Check if the CHW exists in team members by NIN
      const teamMember = await TeamMemberRepository.getTeamMemberByNin(payload.message.body[0].NIN);

      if (teamMember) {
        throw new ApiError("Duplicate CHW ID found.", 409, 2);
      }

      // Check if the location exists
      const location = await OpenMRSLocationRepository.getLocationByHfrCode(payload.message.body[0].hfrCode);

      if (!location || !location.uuid) {
        throw new ApiError("Invalid facilityCode.", 404, 4);
      }

      // Resolve the CHW team-member location from the incoming location code.
      // When locationType is set, the code must match that OpenMRS tag; otherwise
      // ENV policy (ICCHW_LOWEST_OPERATIONAL_HIERARCHY / ACCEPT_HAMLET_CODES_FROM_HRHIS)
      // applies. Resolved before any person/user/team is created so a rejection
      // needs no reversal.
      const teamMemberLocation = await LocationResolver.resolve(
        payload.message.body[0].locationCode,
        payload.message.body[0].locationType
      );

      // Check if a team exists without location
      let team = null;
      try {
        team = await TeamRepository.getTeamByLocationUuid(location.uuid);
      } catch (error) {
        console.error(`Error fetching team by location UUID: ${error.message}`);
      }

      if (!team) {
        try {
          // create team
          team = await OpenmrsHelper.createOpenmrsTeam(location);
        } catch (error) {
          throw new ApiError(`Failed to create team: ${error.message}`, 500, 6);
        }
      }

      console.log("...Team found or created:", team.uuid);

      return { teamMemberLocation, team };
    } catch (error) {
      // Preserve specific errors (duplicate CHW, invalid facility/location code,
      // hierarchy-policy rejections) with their own status/custom codes and messages.
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Invalid payload: ${error.message}`, 400, 1);
    }
  }
}

export default PayloadContent;
