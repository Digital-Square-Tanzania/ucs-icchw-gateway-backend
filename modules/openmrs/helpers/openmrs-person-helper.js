import OpenMRSApiClient from "../../../utils/openmrs-api-client.js";
import CustomError from "../../../utils/custom-error.js";
import ExtractDateFromNIN from "../../../utils/extract-date-from-nin.js";

// Helper class for managing OpenMRS person-related operations
class OpenMRSPersonHelper {
  static async createPersonWithAttributes(payload) {
    if (!payload.firstName || !payload.lastName || !payload.sex) {
      throw new CustomError("Missing required fields: firstName, lastName, or sex", 400);
    }
    const personObject = {
      names: [
        {
          givenName: payload.firstName,
          middleName: payload.middleName || "", // Ensure middleName is not undefined
          familyName: payload.lastName,
          preferred: true,
        },
      ],
      gender: payload.sex && payload.sex.toLowerCase() === "male" ? "M" : "F",
      birthdate: ExtractDateFromNIN.extract(payload.NIN),
    };

    // Validate personObject fields
    if (!personObject.names[0].givenName || !personObject.names[0].familyName) {
      throw new CustomError("Person must have at least one non-deleted name", 400);
    }
    if (!personObject.gender) {
      throw new CustomError("Person gender cannot be empty or null", 400);
    }

    // Create the person in OpenMRS
    const newPerson = await OpenMRSApiClient.post("person", personObject);

    // Safely construct attributes
    const personAttributes = [
      {
        attributeType: process.env.NIN_ATTRIBUTE_TYPE_UUID,
        value: payload.NIN,
        label: "NIN",
      },
      {
        attributeType: process.env.EMAIL_ATTRIBUTE_TYPE_UUID,
        value: payload.email,
        label: "Email",
      },
      {
        attributeType: process.env.PHONE_NUMBER_ATTRIBUTE_TYPE_UUID,
        value: payload.phoneNumber,
        label: "Phone Number",
      },
    ];

    // Validate all attributeType UUIDs exist
    for (const attr of personAttributes) {
      if (!attr.attributeType) {
        throw new CustomError(`Missing environment variable for ${attr.label} attribute type UUID`, 500);
      }
    }

    // Loop through and add each attribute
    for (const attr of personAttributes) {
      try {
        const payload = {
          attributeType: attr.attributeType,
          value: attr.value,
        };
        if (!attr.attributeType) {
          throw new CustomError(`Missing attributeType UUID for attribute with value: ${attr.value}`, 500);
        }
        await OpenMRSApiClient.post(`person/${newPerson.uuid}/attribute`, payload);
      } catch (error) {
        console.error(`❌ Failed to add ${attr.label} to person ${newPerson.uuid}:`, error.message);
        console.log("ERROR:", error.message);
        throw new CustomError(`Error saving person ${attr.label} attribute: ${error.message}`, 500);
      }
    }
    return newPerson;
  }
}
// Export the helper class
export default OpenMRSPersonHelper;
