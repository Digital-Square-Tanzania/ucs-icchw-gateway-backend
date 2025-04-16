import Joi from "joi";
import CustomError from "../../../utils/custom-error.js";

class FrontendValidator {
  // Validate CHW demographics
  static validateCreateChwPayload(payload) {
    const schema = Joi.object({
      firstName: Joi.string().required(),
      middleName: Joi.string().allow(null, ""),
      lastName: Joi.string().required(),
      NIN: Joi.string()
        .pattern(/^\d{8}-\d{5}-\d{5}-\d{2}$/)
        .required(),
      sex: Joi.string().valid("MALE", "FEMALE", "Male", "Female").required(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string()
        .pattern(/^\+255[67]\d{8}$/)
        .required(),
      hfrCode: Joi.string()
        .pattern(/^\d{6}-\d$/)
        .required(),
      locationCode: Joi.string().required(),
    }).required();

    const { error } = schema.validate(payload);

    if (error) {
      throw new CustomError(`Validation error: ${error.message}`, 400);
    }
  }
}

export default FrontendValidator;
