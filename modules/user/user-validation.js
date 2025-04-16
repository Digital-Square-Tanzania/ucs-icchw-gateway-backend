import Joi from "joi";

class UserValidation {
  static createUserSchema() {
    return Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      middleName: Joi.string().trim().max(50).optional().allow(""),
      lastName: Joi.string().trim().min(2).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).+$")).required().messages({
        "string.pattern.base": "Password must include uppercase, lowercase, number, and special character.",
      }),
      phoneNumber: Joi.string()
        .pattern(/^\+?[0-9]{10,15}$/)
        .optional(),
      roleId: Joi.number().integer().required(),
    });
  }

  static updateUserSchema() {
    return Joi.object({
      firstName: Joi.string().trim().min(2).max(50).optional(),
      middleName: Joi.string().trim().max(50).optional().allow(""),
      lastName: Joi.string().trim().min(2).max(50).optional(),
      phoneNumber: Joi.string()
        .pattern(/^(\+255|0)[67][0-9]{8}$/)
        .message("Phone number must be in the format +2557XXXXXXXX or 07XXXXXXXX")
        .optional(),
    });
  }

  static queryParamsSchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid("asc", "desc").default("asc"),
    });
  }

  static createChwSchema() {
    return Joi.object({
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
  }
}

export default UserValidation;
