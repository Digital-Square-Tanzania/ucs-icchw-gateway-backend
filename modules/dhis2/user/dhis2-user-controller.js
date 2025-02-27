import DHIS2UserService from "./dhis2-user-service.js";
import ResponseHelper from "../../../helpers/response-helper.js";

class DHIS2UserController {
  static async syncUsers(_req, res, next) {
    try {
      await DHIS2UserService.syncUsers();
      ResponseHelper.success(res, "DHIS2 Users synced successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(_req, res, next) {
    try {
      const users = await DHIS2UserService.getUsers();
      ResponseHelper.success(res, "DHIS2 Users retrieved successfully.", users);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const userData = req.body;
      const newUser = await DHIS2UserService.createUser(userData);
      ResponseHelper.success(res, "User created successfully in DHIS2.", newUser);
    } catch (error) {
      next(error);
    }
  }
}

export default DHIS2UserController;
