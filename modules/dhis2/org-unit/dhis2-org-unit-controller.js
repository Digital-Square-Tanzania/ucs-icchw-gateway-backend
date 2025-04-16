import DHIS2OrgUnitService from "./dhis2-org-unit-service.js";
import BaseResponse from "../../../responders/base-responder.js";
import { parse } from "dotenv";

class DHIS2OrgUnitController {
  /**
   * Trigger Org Unit Synchronization
   */
  static async syncOrgUnits(req, res, next) {
    try {
      const pageSize = req.query.pageSize;
      console.log("PageSize: ", pageSize);
      await DHIS2OrgUnitService.syncOrgUnits(parseInt(pageSize));
      BaseResponse.success(res, "DHIS2 Org Units synced successfully.");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all Org Units with optional filters
   */
  static async getOrgUnits(req, res, next) {
    try {
      const { name, level, parentUuid, limit, page, sortBy, order } = req.query;

      const data = await DHIS2OrgUnitService.getOrgUnits({
        name,
        level,
        parentUuid,
        limit,
        page,
        sortBy,
        order,
      });

      BaseResponse.success(res, "DHIS2 Org Units retrieved successfully.", data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Grouped Org Units
   */
  static async getGroupedOrgUnits(req, res, next) {
    try {
      const data = await DHIS2OrgUnitService.getGroupedOrgUnits();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default DHIS2OrgUnitController;
