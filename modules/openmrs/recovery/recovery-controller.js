import BaseResponder from "../../../responders/base-responder.js";
import CustomError from "../../../utils/custom-error.js";
import RecoveryService from "./recovery-service.js";

class RecoveryController {
  // Add people in OpenMRS
  static async addPeopleInOpenmrs(req, res, next) {
    try {
      const addedPeople = await RecoveryService.addPeopleInOpenmrs(req, res, next);
      return BaseResponder.success(res, "People added successfully in OpenMRS", addedPeople, 201);
    } catch (error) {
      throw new CustomError("Error adding people in OpenMRS" + error.message, 500);
    }
  }
}

export default RecoveryController;
