import DHIS2Service from "./dhis2-service.js";
import ResponseHelper from "../../helpers/response-helper.js";
class DHIS2Controller {
  /**
   * Trigger Org Unit Synchronization
   */
  static async syncOrgUnits(req, res, next) {
    try {
      await DHIS2Service.syncOrgUnits();
      ResponseHelper.success(res, "DHIS2 Org Units synced successfully.");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all Org Units
   */
  static async getOrgUnits(req, res, next) {
    try {
      const orgUnits = await DHIS2Service.getOrgUnits();
      ResponseHelper.success(res, "DHIS2 Org Units retrieved successfully.", orgUnits);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Grouped Org Units
   */
  static async getGroupedOrgUnits(req, res, next) {
    try {
      const data = await DHIS2Service.getGroupedOrgUnits();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default DHIS2Controller;
