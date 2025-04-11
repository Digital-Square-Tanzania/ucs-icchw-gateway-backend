import GatewayValidator from "../gateway-validator.js";
import TeamRepository from "../../openmrs/team/openmrs-team-repository.js";
import TeamMemberRepository from "../../openmrs/team-member/openmrs-team-member-repository.js";
import OpenMRSLocationRepository from "../../openmrs/location/openmrs-location-repository.js";
import OpenmrsHelper from "./openmrs-helper.js";
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
      if (!location) {
        throw new ApiError("Invalid locationCode or locationType.", 404, 4);
      }

      // GET teamMemberLocation by location Code attribute
      const teamMemberLocation = await OpenMRSLocationRepository.getLocationByCode(payload.message.body[0].locationCode);
      if (!teamMemberLocation) {
        throw new ApiError("Invalid locationCode or locationType.", 404, 4);
      }

      // Check if a team exists without location
      const team = await TeamRepository.getTeamByLocationUuid(location.uuid);

      if (!team) {
        // create team
        await OpenmrsHelper.createOpenmrsTeam(location);
      }

      return { teamMemberLocation, team };
    } catch (error) {
      throw new ApiError(`Invalid payload: ${error.stack}`, 400, 1);
    }
  }
}

export default PayloadContent;
