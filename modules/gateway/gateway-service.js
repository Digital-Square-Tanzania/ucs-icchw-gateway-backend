import ApiError from "../../utils/api-error.js";
import dotenv from "dotenv";
import GatewayValidator from "./gateway-validator.js";
import OpenMRSLocationRepository from "../openmrs/location/openmrs-location-repository.js";
import TeamRepository from "../openmrs/team/openmrs-team-repository.js";
import openmrsApiClient from "../../utils/openmrs-api-client.js";
import TeamMemberRepository from "../openmrs/team-member/openmrs-team-member-repository.js";
import MemberRoleRepository from "../openmrs/member-role/openmrs-member-role-repository.js";
import EmailService from "../../utils/email-service.js";
import ApiLogger from "../../utils/api-logger.js";
import GenerateActivationSlug from "../../utils/generate-activation-slug.js";
import GenerateSwahiliPassword from "../../utils/generate-swahili-password.js";
import CHWEligibilityStatuses from "./helpers/chw-eligibility-statuses.js";
import PayloadContent from "./helpers/payload-content.js";
import OpenmrsHelper from "./helpers/openmrs-helper.js";
import TeamMemberService from "../openmrs/team-member/openmrs-team-member-service.js";
import mysqlClient from "../../utils/mysql-client.js";
import { FfarsSignature } from "../../utils/ffars-signature.js";
import prisma from "../../config/prisma.js";
import UserService from "../user/user-service.js";

dotenv.config();

class GatewayService {
  // Generate message ID
  static async generateMessageId() {
    const now = new Date();

    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const SSS = String(now.getMilliseconds()).padStart(3, "0");

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}${SSS}`;
  }

  // Get CHW monthly status by HFR code

  static async getChwMonthlyStatus(req, res, next) {
    try {
      const { message, signature } = req.body;
      if (!message || !message.header || !message.body) {
        throw new CustomError("Both message body and header are required for verification.", 400);
      }
      if (!signature) {
        throw new CustomError("Signature is required for verification.", 400);
      }
      const isVerified = await GatewayService.verifyMessageFromFfars(message, signature);
      // @TODO: Uncomment this when signature verification is needed
      // if (!isVerified) {
      //   throw new ApiError("Signature verification failed. Invalid message signature.", 401, 1);
      // }

      const body = req.body.message.body;
      const month = body.month;
      const year = body.year;

      GatewayValidator.validateMonthAndYear(month, year);
      const hfrCode = body.FacilityCode;
      const teamMembers = await TeamMemberRepository.getTeamMembersByLocationHfrCode(hfrCode);

      if (!teamMembers) {
        throw new ApiError("CHW monthly activity statistics not found.", 404, 5);
      }

      console.log("🔄 Getting monthly status for team members...");
      const payload = await CHWEligibilityStatuses.get(month, year, teamMembers);
      console.log("✅ Statuses obtained and sent!");

      await ApiLogger.log(req, payload);

      return payload;
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      if (!(error instanceof ApiError)) {
        throw new ApiError(error.message, 500, 5);
      }
      throw error;
    }
  }

  // Register new CHW from HRHIS
  static async registerChwFromHrhis(req, _res, _next) {
    console.log("🔄 Registering CHW from HRHIS...");
    let newPerson = null;
    try {
      // Get the payload from the request body
      const payload = req.body;

      // Validate incoming CHW deployment payload
      const payloadContent = new PayloadContent(payload);
      const validatedContent = await payloadContent.validate();

      // Create a new person and attributes
      let newPerson = await OpenmrsHelper.createOpenmrsPerson(payload);

      // Capture the person ID for reverting deletion
      const newPersonId = await openmrsApiClient.get(`person/${newPerson.uuid}`, {
        v: "custom:(id)",
      });
      newPerson.id = newPersonId.id;

      // Create a new OpenMRS user
      const newUser = await OpenmrsHelper.createOpenmrsUser(payload, newPerson);

      // Create a new team member in OpenMRS and in UCS
      const newTeamMember = await TeamMemberService.createTeamMember(newUser, payload, validatedContent, newPerson);

      // Generate an activation slug and record
      const slug = await GenerateActivationSlug.generate(newUser.uuid, "ACTIVATION", 32);
      const backendUrl = process.env.BACKEND_URL || "https://ucs.moh.go.tz";
      const activationUrl = `${backendUrl}/api/v1/user/chw/activate/${slug}`;

      // Send email to the CHW with their login credentials
      await EmailService.sendEmail({
        to: payload.message.body[0].email,
        subject: "Kufungua Akaunti ya UCS/WAJA",
        text: `Hongera, umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kufungua akaunti yako ili uweze kutumia kishkwambi(Tablet) cha kazi: ${activationUrl}. Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji (${newUser.username}).`,
        html: `<h1><strong>Hongera!</strong></h1> <p>Umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kuhuisha akaunti yako ili uweze kutumia kishkwambi(Tablet) chako.</p>
           <p><a href="${activationUrl}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Fungua Akaunti</a></p>
           <p>Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji: <strong>(${newUser.username})</strong>.</p><br>`,
      });

      // Log the entire brouhaha
      await ApiLogger.log(req, { member: newTeamMember, slug });
      return "Facility and personnel details processed successfully.";
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });

      // Remove the created person and user if any error occurs
      if (newPerson && newPerson.id) {
        try {
          await mysqlClient.query("USE openmrs");
          await mysqlClient.query("CALL delete_person(?)", [newPerson.id]);
          console.log(`Successfully deleted person with ID: ${newPerson.id}`);
        } catch (deleteError) {
          console.error(`Failed to delete person with ID: ${newPerson.id}`, deleteError);
        }
      }

      console.error("❌ Error while registering CHW from HRHIS:", error.stack);

      // Rethrow with CustomError for the controller to catch
      if (!(error instanceof ApiError)) {
        throw new ApiError(error.message, 500, 5);
      }
      throw error;
    }
  }

  // Update CHW demographics from HRHIS
  static async updateChwDemographics(req, res, next) {
    try {
      const payload = req.body;

      // Validate the payload
      GatewayValidator.validateChwDemographicUpdate(payload);

      const chwUpdates = Array.isArray(payload.message.body) ? payload.message.body : [payload.message.body];

      const results = [];

      for (const chw of chwUpdates) {
        const teamMember = await TeamMemberRepository.getTeamMemberByNin(chw.NIN);

        if (!teamMember || !teamMember.openMrsUuid) {
          throw new ApiError(`CHW with NIN ${chw.NIN} not found in UCS.`, 404, 6);
        }

        const teamMemberDetails = await openmrsApiClient.get(`team/teammember/${teamMember.openMrsUuid}`, { v: "custom:(uuid,person:(uuid))" });

        const personUuid = teamMemberDetails.person?.uuid;
        if (!personUuid) {
          throw new ApiError(`Person UUID not found for NIN ${chw.NIN}`, 400, 7);
        }

        const existingPerson = await openmrsApiClient.get(`person/${personUuid}`, {
          v: "full",
        });

        const personUpdatePayload = {};
        const updatedFields = [];
        const emailAttributeTypeUuid = process.env.OPENMRS_EMAIL_ATTRIBUTE_TYPE_UUID || "c60b17ba-1c41-454b-89a1-6c329c75417e";

        // ✅ Gender
        if (chw.sex && (chw.sex.toUpperCase() === "MALE" || chw.sex.toUpperCase() === "FEMALE")) {
          const gender = chw.sex.toUpperCase() === "MALE" ? "M" : "F";
          if (gender !== existingPerson.gender) {
            personUpdatePayload.gender = gender;
            updatedFields.push("sex");
          }
        }

        // ✅ Names
        const existingName = existingPerson.preferredName || {};
        const nameUpdate = {};
        let nameChanged = false;

        if (chw.firstName && chw.firstName !== existingName.givenName) {
          nameUpdate.givenName = chw.firstName;
          updatedFields.push("firstName");
          nameChanged = true;
        }
        if (chw.middleName !== undefined && chw.middleName !== existingName.middleName) {
          nameUpdate.middleName = chw.middleName;
          updatedFields.push("middleName");
          nameChanged = true;
        }
        if (chw.lastName && chw.lastName !== existingName.familyName) {
          nameUpdate.familyName = chw.lastName;
          updatedFields.push("lastName");
          nameChanged = true;
        }

        if (nameChanged) {
          nameUpdate.givenName = nameUpdate.givenName || existingName.givenName || "";
          nameUpdate.middleName = nameUpdate.middleName !== undefined ? nameUpdate.middleName : existingName.middleName || null;
          nameUpdate.familyName = nameUpdate.familyName || existingName.familyName || "";

          personUpdatePayload.names = [nameUpdate];
        }

        // ✅ Email
        if (chw.email) {
          const newEmail = chw.email.trim();
          const existingEmailAttr = (existingPerson.attributes || []).find((attr) => attr.attributeType.uuid === emailAttributeTypeUuid && !attr.voided);

          const existingEmail = existingEmailAttr?.value?.trim();

          if (!existingEmailAttr) {
            // Create new email attribute
            await openmrsApiClient.post(`person/${personUuid}/attribute`, {
              attributeType: emailAttributeTypeUuid,
              value: newEmail,
            });
            updatedFields.push("email");
          } else if (existingEmail !== newEmail) {
            // Update existing email attribute
            await openmrsApiClient.post(`person/${personUuid}/attribute/${existingEmailAttr.uuid}`, {
              value: newEmail,
            });
            updatedFields.push("email");
          }
        }

        // ✅ Apply core person updates (gender/names)
        if (Object.keys(personUpdatePayload).length > 0) {
          await openmrsApiClient.post(`person/${personUuid}`, personUpdatePayload);
        }

        // Local DB upsert payload
        const member = {
          identifier: teamMember.identifier,
          firstName: chw.firstName ?? teamMember.firstName,
          middleName: chw.middleName ?? teamMember.middleName,
          lastName: chw.lastName ?? teamMember.lastName,
          email: chw.email ?? teamMember.email,
          phoneNumber: chw.phoneNumber ?? teamMember.phoneNumber,
          personUuid,
          userUuid: teamMember.userUuid,
          username: teamMember.username,
          teamUuid: teamMember.teamUuid,
          teamName: teamMember.teamName,
          teamIdentifier: teamMember.teamIdentifier,
          locationUuid: teamMember.locationUuid,
          locationName: teamMember.locationName,
          locationDescription: teamMember.locationDescription,
          openMrsUuid: teamMember.openMrsUuid,
          NIN: chw.NIN, // lowercase 'nin' to match Prisma field
          updatedAt: new Date(),
        };

        await TeamMemberRepository.upsertTeamMembers([member]);

        results.push({
          message: updatedFields.length > 0 ? "CHW demographic updated." : "No changes detected for CHW.",
          nin: chw.NIN,
          personUuid,
          updatedFields,
        });

        const slug = await prisma.accountActivation.findFirst({
          where: { userUuid: teamMember.userUuid, slugType: "ACTIVATION", isUsed: false },
          select: { slug: true },
        });

        if (updatedFields.includes("email") && slug) {
          req.params.slug = slug.slug;
          UserService.handleResendEmail(req, res, next);
        }
        console.log("Request Parameters Slug", req.params.slug);
      }

      console.log("✅ CHW demographic updates processed.");
      return results;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw new ApiError(error.message, 500, 5);
      }
      throw error;
    }
  }

  // Change CHW duty station
  static async changeChwDutyStation(req, _res, _next) {
    console.log("🔄 Changing CHW Duty Station...");
    try {
      const payload = req.body;

      // Validate payload (e.g., NIN and new HFR code)
      GatewayValidator.validateChwDutyStationChange(payload);

      const chw = payload.message.body[0];
      const existingMember = await TeamMemberRepository.getTeamMemberByNin(chw.NIN);
      const existingHfrCode = await TeamMemberRepository.getLocationHfrCodeByUuid(existingMember.locationUuid);
      console.log("EXISTING HFR", existingHfrCode);
      console.log("INCOMING HFR", chw.newHfrCode);
      // Check if the HFR code is new
      if (existingHfrCode === chw.newHfrCode) {
        throw new ApiError(`This is the current ${existingMember.firstName} ${existingMember.lastName}'s Location. No change!`, 400, 4);
      }

      const newLocation = await OpenMRSLocationRepository.getLocationByHfrCode(chw.newHfrCode);
      if (!newLocation) {
        throw new ApiError(`Invalid HFR code ${chw.newHfrCode}`, 404, 5);
      }

      if (!existingMember || !existingMember.openMrsUuid) {
        throw new ApiError(`CHW with NIN ${chw.NIN} not found.`, 404, 6);
      }

      // 1. Get the existing OpenMRS team member details
      const currentTeamMember = await openmrsApiClient.get(`team/teammember/${existingMember.openMrsUuid}`, {
        v: "full",
      });

      // 2. Void the old team member in OpenMRS
      await openmrsApiClient.post(`team/teammember/${existingMember.openMrsUuid}?!purge`, {
        voided: true,
        voidReason: "Duty-Station-Change",
      });

      // Step 1: Get existing user by username
      const phone = existingMember.phoneNumber;
      const existingUsername =
        phone && phone.startsWith("+255")
          ? phone.replace("+255", "0")
          : (existingMember.firstName?.substring(0, 2) + existingMember.lastName?.substring(0, 2)).toLowerCase() + Math.floor(100 + Math.random() * 900);

      const existingUsers = await openmrsApiClient.get(`user`, {
        q: existingUsername,
        v: "custom:(uuid,username,person:(uuid),retired)",
      });

      const existingUser = existingUsers?.results?.find((user) => user.username === existingUsername);

      // Step 2: Retire the existing user if found and not already retired
      if (existingUser && !existingUser.retired) {
        // 1. Retire the user
        await openmrsApiClient.delete(`user/${existingUser.uuid}?reason=Duty Station Change&purge=true`);
      }

      // Step 3: Create new user (same username, new password, and same person UUID)
      const roleUuid = await MemberRoleRepository.getRoleUuidByRoleName("iCCHW");

      let usernameCounter = await TeamMemberRepository.getUsernameCounterByNin(chw.NIN);
      let counter = usernameCounter?.counter || 0;

      const counterTicker = Number(counter) + 1;
      console.log("COUNTER TICKER", counterTicker);

      await TeamMemberRepository.updateUsernameCounterStats(chw.NIN, counterTicker);

      const newUserObject = {
        username: existingUsername + "_" + counterTicker,
        password: GenerateSwahiliPassword.generate(),
        roles: [roleUuid],
        person: {
          uuid: currentTeamMember.person.uuid,
        },
        systemId: existingUsername + "_" + counterTicker,
      };

      const newUser = await openmrsApiClient.post("user", newUserObject);

      if (!newUser) {
        throw new ApiError("User could not be created after duty station change", 400, 3);
      }

      // Step 4. Check if team exists at new location
      let newTeam = await TeamRepository.getTeamByLocationUuid(newLocation.uuid);
      if (!newTeam) {
        const teamName = newLocation.name + " - " + newLocation.hfrCode + " - Team";
        const teamIdentifier = teamName.replace(/-/g, "").replace(/\s+/g, "").toLowerCase();
        const teamObject = {
          location: newLocation.uuid,
          teamName,
          teamIdentifier,
        };
        newTeam = await openmrsApiClient.post("team/team", teamObject);
        await TeamRepository.upsertTeam(newTeam);
      }

      // Step 5. Create new team member using same person UUID and teamRole
      const newTeamMemberObject = {
        identifier: existingMember.username + "_" + counterTicker + newLocation.hfrCode.replace("-", ""),
        locations: [{ uuid: newLocation.uuid }],
        joinDate: new Date().toISOString().split("T")[0],
        team: { uuid: newTeam.uuid },
        // teamRole: { uuid: currentTeamMember.teamRole?.uuid },
        teamRole: currentTeamMember.teamRole?.uuid,
        person: { uuid: currentTeamMember.person.uuid },
        isDataProvider: "false",
      };

      const newTeamMember = await openmrsApiClient.post("team/teammember", newTeamMemberObject);

      // Step 6. Get updated member details
      const updatedDetails = await openmrsApiClient.get(`team/teammember/${newTeamMember.uuid}`, {
        v: "custom:(uuid,identifier,dateCreated,teamRole,person:(uuid,preferredName:(givenName,middleName,familyName)),team:(uuid,teamName,teamIdentifier,location:(uuid,name,description)))",
      });

      const formatted = {
        identifier: updatedDetails.identifier,
        firstName: updatedDetails.person?.preferredName?.givenName,
        middleName: updatedDetails.person?.preferredName?.middleName,
        lastName: updatedDetails.person?.preferredName?.familyName,
        personUuid: updatedDetails.person?.uuid,
        username: newUser.username,
        userUuid: newUser.uuid,
        NIN: existingMember.NIN,
        phoneNumber: existingMember.phoneNumber,
        email: existingMember.email,
        openMrsUuid: updatedDetails.uuid,
        teamUuid: updatedDetails.team?.uuid,
        teamName: updatedDetails.team?.teamName,
        teamIdentifier: updatedDetails.team?.teamIdentifier,
        locationUuid: updatedDetails.team?.location?.uuid,
        locationName: updatedDetails.team?.location?.name,
        locationDescription: updatedDetails.team?.location?.description,
        roleUuid: updatedDetails.teamRole?.uuid,
        roleName: updatedDetails.teamRole?.name,
        updatedAt: new Date(),
      };

      // Step 7. Update local DB record
      const localUpdated = await TeamMemberRepository.upsertTeamMember(formatted);

      console.log("✅ Duty station changed successfully.");
      await EmailService.sendEmail({
        to: formatted.email,
        subject: "Kubadili Akaunti ya UCS/WAJA",
        text: `Tumepokea maombi ya kuhamisha akaunti yako kutoka kituo ulichokuwa awali ${existingMember.teamName} kwenda kwenye kituo chako kipya cha kazi ${formatted.teamName}. Jina la kutumia kwa akaunti hii ni: ${formatted.username}. Tafadhali tumia link hii hapa chini kuhuisha upya akaunti yako mpya: https://ucs.moh.go.tz/user-management/move?username=${formatted.username}`,
        html: `<p>Tumepokea maombi ya kuhamisha akaunti yako kutoka kituo ulichokuwa awali ${existingMember.teamName} kwenda kwenye kituo chako kipya cha kazi ${formatted.teamName}.</p> <p>Jina la kutumia kwa akaunti hii ni: <em>${formatted.username}</em>.</p> <p>Tafadhali tumia link hii hapa chini kuhuisha upya akaunti yako mpya:</p>
           <p><a href="https://ucs.moh.go.tz/user-management/move?username=${formatted.username}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Huisha Akaunti</a></p>`,
      });

      return "CHW duty station changed successfully!";
    } catch (error) {
      console.error("❌ Error in changing duty station:", error.message);
      if (!(error instanceof ApiError)) {
        throw new ApiError(error.message, 500, 5);
      }
      throw error;
    }
  }

  // Random password generator
  static generateRandomPassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  // Generate HRHIS Response Parts
  static async generateHrhisReponseParts(req) {
    const header = req.body.message.header;
    // const signature = req.body.signature;
    const responseHeader = {};
    responseHeader.sender = header.receiver;
    responseHeader.receiver = header.sender;
    responseHeader.messageType = header.messageType.endsWith("_REQUEST") ? header.messageType.replace("_REQUEST", "_RESPONSE") : header.messageType + "_RESPONSE";
    responseHeader.messageId = this.generateMessageId;
    responseHeader.createdAt = new Date().toISOString();
    const responseObject = {};
    responseObject.header = responseHeader;
    // req.signature = signature;

    return responseObject;
  }

  // Test Signature
  static async testSignature() {
    const ffarsSignature = new FfarsSignature();
    const verified = ffarsSignature.test();
    return verified;
  }

  // Verify Message from FFARS
  static async verifyMessageFromFfars(message, signature) {
    const ffarsSignature = new FfarsSignature();
    const isVerified = ffarsSignature.verifyMessageFromFfars(message, signature);
    return isVerified;
  }

  // Verify Message from UCS
  static async verifyMessageFromUcs(message, signature) {
    const ffarsSignature = new FfarsSignature();
    const isVerified = ffarsSignature.verifyMessageFromUcs(message, signature);
    return isVerified;
  }

  // Sign Message
  static async signMessage(message) {
    const ffarsSignature = new FfarsSignature();
    const signature = ffarsSignature.signMessage(message);
    return signature;
  }
}

export default GatewayService;
