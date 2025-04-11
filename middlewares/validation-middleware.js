import { body, validationResult } from "express-validator";
import BaseResponse from "../responders/base-responder.js";

class ValidationMiddleware {
  /**
   * Validate request body against Joi schema.
   * @param {Object} schema - Joi validation schema.
   */
  static validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        const errorMessages = error.details.map((err) => err.message);
        return BaseResponse.error(res, `Validation error: ${errorMessages.join(", ")}`, 400);
      }

      req.body = value;
      next();
    };
  }

  /**
   * Sanitize user inputs using express-validator.
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
          return BaseResponse.error(res, "Input sanitization failed", 400, errors.array());
        }
        next();
      },
    ];
  }
}

export default ValidationMiddleware;
