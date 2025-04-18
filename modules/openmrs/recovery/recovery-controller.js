import BaseResponder from "../../../responders/base-responder.js";
import CustomError from "../../../utils/custom-error.js";
import RecoveryService from "./recovery-service.js";

class RecoveryController {
  // Add people in OpenMRS
  static async addPeopleInOpenmrs(req, res, next) {
    try {
      const addedPeople = await RecoveryService.addPeopleInOpenmrs();
      return BaseResponder.success(res, "People added successfully in OpenMRS", addedPeople, 201);
    } catch (error) {
      throw new CustomError("Error adding people in OpenMRS" + error.message, 500);
    }
  }

  // Create recovered accounts
  static async createRecoveredAccounts(req, res, next) {
    try {
      const payload = req.body;
      const createdAccounts = await RecoveryService.createRecoveredAccounts(payload);
      return BaseResponder.success(res, "Recovered accounts created successfully", createdAccounts, 201);
    } catch (error) {
      throw new CustomError("Error creating recovered accounts" + error.message, 500);
    }
  }
}

export default RecoveryController;
