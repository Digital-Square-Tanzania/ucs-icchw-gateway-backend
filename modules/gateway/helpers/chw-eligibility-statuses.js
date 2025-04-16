import CustomError from "../../../utils/custom-error.js";
import openSRPApiClient from "../../../utils/opensrp-api-client.js";

class CHWEligibilityStatuses {
  /**
   *
   * @param {*} month
   * @param {*} year
   * @param {*} teamMembers
   * @returns {Promise<*>}
   * @throws {CustomError} - If there is an error fetching the data
   * @description Fetches the monthly status of CHWs from OpenSRP.
   */
  static async get(month, year, teamMembers) {
    try {
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

      // Return the response
      return chwMonthlyStatusResponse;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode);
    }
  }
}

export default CHWEligibilityStatuses;
