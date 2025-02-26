import Joi from "joi";

class LocationValidation {
  // Validation for getAllLocations query parameters
  static getAllLocationsSchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1).messages({
        "number.base": `"page" must be a number`,
        "number.min": `"page" must be at least 1`,
      }),
      limit: Joi.number().integer().min(1).max(100).default(10).messages({
        "number.base": `"limit" must be a number`,
        "number.min": `"limit" must be at least 1`,
        "number.max": `"limit" cannot exceed 100`,
      }),
      tagId: Joi.number().integer().optional().messages({
        "number.base": `"tagId" must be a number`,
      }),
      region: Joi.string().max(255).optional().messages({
        "string.base": `"region" must be a string`,
        "string.max": `"region" cannot exceed 255 characters`,
      }),
      facilityType: Joi.string().max(255).optional().messages({
        "string.base": `"facilityType" must be a string`,
        "string.max": `"facilityType" cannot exceed 255 characters`,
      }),
    });
  }
}

export default LocationValidation;
