import Joi from "joi";

class UserValidation {
  /**
   * Joi schema for user creation.
   */
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
}

export default UserValidation;
