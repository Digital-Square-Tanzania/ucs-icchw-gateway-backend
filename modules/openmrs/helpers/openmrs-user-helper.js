import OpenMRSApiClient from "../openmrs-api-client.js";
import CustomError from "../../../utils/custom-error.js";
import MemberRoleRepository from "../member-role/openmrs-member-role-repository.js";
import GenerateSwahiliPassword from "../../../utils/generate-swahili-password.js";

class OpenMRSUserHelper {
  static async create(payload, personUuid) {
    try {
      const roleUuid = await MemberRoleRepository.getRoleUuidByRoleName(process.env.DEFAULT_ICCHW_ROLE_NAME);
      const userObject = {};
      const phone = payload.phoneNumber;
      const firstName = payload.firstName || "";
      const lastName = payload.lastName || "";

      userObject.username = phone && phone.startsWith("+255") ? phone.replace("+255", "0") : (firstName.substring(0, 2) + lastName.substring(0, 2)).toLowerCase();
      userObject.password = GenerateSwahiliPassword.generate();
      userObject.roles = [roleUuid];
      userObject.person = {};
      userObject.person.uuid = personUuid;
      userObject.systemId = userObject.username;

      // Create the user in OpenMRS
      const newUser = await OpenMRSApiClient.post("user", userObject);

      if (!newUser) {
        throw new ApiError(`User could not be created: +${error.message}`, 400, 3);
      }
      return newUser;
    } catch (error) {
      console.error("Error creating user in OpenMRS:", error);
      throw new CustomError(`Failed to create user: ${error.message}`, 500);
    }
  }
}

export default OpenMRSUserHelper;
