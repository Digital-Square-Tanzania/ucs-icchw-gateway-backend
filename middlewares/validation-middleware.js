// import Joi from "joi";
import { validationResult, body } from "express-validator";
import ResponseHelper from "../helpers/response-helper.js";

class ValidationMiddleware {
  /**
   * Validates request body against Joi schema.
   * @param {Object} schema - Joi validation schema.
   */
  static validate(schema) {
    return (req, res, next) => {
      const options = {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      };

      const { error, value } = schema.validate(req.body, options);

      if (error) {
        const errorMessages = error.details.map((err) => err.message);
        return ResponseHelper.error(res, `Validation error: ${errorMessages.join(", ")}`, 400);
      }

      req.body = value;
      next();
    };
  }

  /**
   * Sanitizes user inputs using express-validator.
   */
  static sanitizeUserInputs() {
    return [
      body("firstName").trim().escape(),
      body("middleName").optional().trim().escape(),
      body("lastName").trim().escape(),
      body("email").isEmail().normalizeEmail(),
      body("phoneNumber").optional().trim().escape(),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return ResponseHelper.error(res, "Input sanitization failed", 400, errors.array());
        }
        next();
      },
    ];
  }
}

export default ValidationMiddleware;
