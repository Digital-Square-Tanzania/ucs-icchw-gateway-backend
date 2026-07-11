import GatewayValidator from "../gateway-validator.js";
import TeamRepository from "../../openmrs/team/openmrs-team-repository.js";
import OpenMRSLocationRepository from "../../openmrs/location/openmrs-location-repository.js";
import OpenmrsHelper from "./openmrs-helper.js";
import LocationResolver from "./location-resolver.js";
import ApiError from "../../../utils/api-error.js";

class PayloadContent {
  constructor(payload) {
    this.payload = payload;
  }

  /**
   * Validates the payload for CHW deployment (create path).
   * Does not reject existing NINs — the register service routes those to update.
   * @throws {ApiError} If the payload is invalid
   * @returns {Promise<{ teamMemberLocation: Object, team: Object }>}
   */
  async validate() {
    try {
      const { payload } = this;

      GatewayValidator.validateChwDemographics(payload);

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

      let team = null;
      try {
        team = await TeamRepository.getTeamByLocationUuid(location.uuid);
      } catch (error) {
        console.error(`Error fetching team by location UUID: ${error.message}`);
      }

      if (!team) {
        try {
          team = await OpenmrsHelper.createOpenmrsTeam(location);
        } catch (error) {
          throw new ApiError(`Failed to create team: ${error.message}`, 500, 6);
        }
      }

      console.log("...Team found or created:", team.uuid);

      return { teamMemberLocation, team };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Invalid payload: ${error.message}`, 400, 1);
    }
  }
}

export default PayloadContent;
