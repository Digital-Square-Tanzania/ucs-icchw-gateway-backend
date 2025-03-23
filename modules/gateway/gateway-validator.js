import Joi from "joi";
import CustomError from "../../utils/custom-error.js";

class GatewayValidator {
  // Validate month and year
  static validateMonthAndYear(month, year) {
    const schema = Joi.object({
      month: Joi.number().min(1).max(12).required(),
      year: Joi.number().max(new Date().getFullYear()).required(),
    });

    const { error } = schema.validate({ month, year });

    if (error) {
      throw new CustomError(`Validation error: ${error.message}`, 400);
    }
  }

  // Validate CHW demographics
  static validateChwDemographics(payload) {
    const schema = Joi.object({
      message: Joi.object({
        header: Joi.object({
          sender: Joi.string().required(),
          receiver: Joi.string().required(),
          messageType: Joi.string().valid("CHW_DEPLOYMENT").required(),
          messageId: Joi.string().required(),
          createdAt: Joi.date().iso().required(),
        }).required(),
        body: Joi.array()
          .items(
            Joi.object({
              firstName: Joi.string().required(),
              middleName: Joi.string().allow(null, ""),
              lastName: Joi.string().required(),
              NIN: Joi.string()
                .pattern(/^\d{8}-\d{5}-\d{5}-\d{2}$/)
                .required(),
              sex: Joi.string().valid("MALE", "FEMALE").required(),
              email: Joi.string().email().required(),
              phoneNumber: Joi.string()
                .pattern(/^\+255[67]\d{8}$/)
                .required(),
              hfrCode: Joi.string()
                .pattern(/^\d{6}-\d$/)
                .required(),
              // .custom((value, helpers) => {
              //   if (!GatewayValidator.isValidHfrCode(value)) {
              //     return helpers.error("any.invalid");
              //   }
              //   return value;
              // }, "HFR Code Checksum Validation"),
              locationCode: Joi.string().required(),
              locationType: Joi.string().required(),
            })
          )
          .required(),
      }).required(),
    });

    const { error } = schema.validate(payload);

    if (error) {
      throw new CustomError(`Validation error: ${error.message}`, 400);
    }
  }

  static isValidHfrCode(code) {
    const match = code.match(/^(\d{6})-(\d)$/);
    if (!match) return false;

    const [_, numberPart, checkDigitStr] = match;
    const digits = numberPart.split("").map(Number);
    const weights = [7, 6, 5, 4, 3, 2];

    const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
    const mod = sum % 11;
    const checkDigit = parseInt(checkDigitStr, 10);

    return mod === checkDigit;
  }
}

export default GatewayValidator;
