import bcrypt from "bcryptjs";
import UserRepository from "./user-repository.js";
import CustomError from "../../utils/custom-error.js";
import prisma from "../../config/prisma.js";
import ApiLogger from "../../utils/api-logger.js";
import openmrsApiClient from "../../utils/openmrs-api-client.js";
import EmailService from "../../utils/email-service.js";
import GenerateActivationSlug from "../../utils/generate-activation-slug.js";
import OpenMRSPersonHelper from "../openmrs/helpers/openmrs-person-helper.js";
import OpenMRSUserHelper from "../openmrs/helpers/openmrs-user-helper.js";
import TeamMemberService from "../openmrs/team-member/openmrs-team-member-service.js";
import TeamMemberRepository from "../openmrs/team-member/openmrs-team-member-repository.js";
import OpenMRSLocationRepository from "../openmrs/location/openmrs-location-repository.js";
import { getCouncilUserUuids, getCouncilMembersPaginated } from "./council-members-repository.js";
import TeamRepository from "../openmrs/team/openmrs-team-repository.js";
import TeamService from "../openmrs/team/openmrs-team-service.js";
import PayloadContent from "../gateway/helpers/payload-content.js";
import resendActivationCron from "../../utils/resend-activation-cron.js";

const backendUrl = process.env.BACKEND_URL || "https://ucs.moh.go.tz";

class UserService {
  static async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;

    const newUser = await UserRepository.createUser(userData);
    const { password, ...safeUserData } = newUser;
    return safeUserData;
  }

  // 🔹 Pass pagination params
  static async getAllUsers(page, limit) {
    return UserRepository.getAllUsers(page, limit);
  }

  static async getUserById(userId) {
    const user = await UserRepository.getUserById(userId);
    if (!user) throw new Error("User not found.");
    const { password, ...safeUserData } = user;
    return safeUserData;
  }

  static async updateUser(userId, userData) {
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;
    }
    const updatedUser = await UserRepository.updateUser(userId, userData);
    const { password, ...safeUserData } = updatedUser;
    return safeUserData;
  }

  /**
   * Delete a user by ID
   * @param {string} userId - The ID of the user to delete
   * @returns {Promise<void>} - A promise that resolves when the user is deleted
   * @throws {Error} - Throws an error if the user is not found or if there is an issue with deletion
   * @description This method deletes a user by their ID. It first checks if the user exists, and if so, it deletes the user from the database.
   */
  static async deleteUser(userId) {
    return UserRepository.deleteUser(userId);
  }

  /**
   * Activate new CHW account route
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async renderActivationPage(req, res, next) {
    try {
      const slug = req.params.slug;
      const activation = await prisma.accountActivation.findUnique({
        where: {
          slug,
        },
      });
      const member = await prisma.openMRSTeamMember.findUnique({
        where: { userUuid: activation.userUuid },
      });

      if (!member) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };

      if (!activation) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };
      if (activation.isUsed) return { alert: true, message: "Akaunti hii tayari inatumika.", slug, login: false };
      if (Date.now() > activation.expiryDate) return { alert: true, message: "Muda wa kuwasha akaunti umepitiliza.", slug, login: false, resend: true, username: member.username };
      console.log("🔄 Valid activation link received, rendering activation page for slug: ", slug);
      await ApiLogger.log(req, activation);
      return { alert: false, alertMessage: "Ingiza password mpya ya UCS.", slug, login: true, username: member.username, resend: false };
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }

  /**
   * Handle new Activation route
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async activateChwAccount(slug, password, confirmPassword) {
    try {
      const activation = await prisma.accountActivation.findUnique({
        where: {
          slug,
        },
      });

      if (!activation.userUuid) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };

      if (activation.isUsed || Date.now() > new Date(activation.expiryDate)) {
        return { alert: true, message: "Muda wa kuwasha akaunti umepitiliza.", slug, login: false };
      }

      const member = await prisma.openMRSTeamMember.findUnique({
        where: { userUuid: activation.userUuid },
      });

      if (!member) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };
      if (password !== confirmPassword) {
        return { alert: true, message: "Password ulizoingiza hazifanani.", slug, login: true, username: member.username };
      }

      // Update OpenMRS password
      const openmrsUser = await openmrsApiClient.postReturningRawResponse(`password/${activation.userUuid}`, {
        newPassword: password,
      });
      console.log("🔄 OpenMRS user updated successfully: ", openmrsUser.statusCode);
      if (openmrsUser.status !== 200) {
        return { alert: true, message: "Kuna tatizo!. Tafadhali jaribu tena baadaye.", slug, login: false };
      }
      // Save activation status
      const newActivation = await prisma.accountActivation.update({
        where: { slug },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Log the activation
      await ApiLogger.log({ newActivation, openmrsUser });
      console.log("🔄 Activation successful for slug: ", slug);

      // Respond to the user frontend on success
      return { alert: false, message: "Akaunti ya WAJA/UCS imeundwa. Sasa unaweza kutumia akaunti hiyo kwenye kishkwambi ulichopewa.", login: false };
    } catch (error) {
      await ApiLogger.log({ statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }

  /**
   * Handle email resend route
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async handleResendEmail(req, res, next) {
    try {
      const slug = req.params.slug;
      console.log("🔄 Resending activation email for slug: ", slug);
      const activation = await prisma.accountActivation.findUnique({
        where: {
          slug,
        },
      });

      const member = await prisma.openMRSTeamMember.findUnique({
        where: { userUuid: activation.userUuid },
      });

      if (!member) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };

      if (!activation) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };
      if (activation.isUsed) return { alert: true, message: "Akaunti hii tayari inatumika.", slug, login: false };
      if (Date.now() < activation.expiryDate) return { alert: true, message: "Linki uliyotumiwa awali ipo sawa, itumie.", slug, login: true, resend: false };
      const openSlugs = await prisma.accountActivation.findMany({
        where: {
          userUuid: activation.userUuid,
          slugType: "ACTIVATION",
          isUsed: false,
          expiryDate: {
            gte: new Date(),
          },
        },
      });

      console.log("🔄 Open slugs for user: ", openSlugs);
      console.log("Request is Email Change: ", req.params.emailChange);
      if (openSlugs.length > 0 && !req.params.emailChange) return { alert: true, message: "Tumia linki mpya uliyotumiwa kwenye email.", slug, login: false, resend: false };
      console.log("🔄 Valid email resend request received, resending the email for slug: ", slug);

      let payload = {};
      payload.email = activation.email;
      payload.nin = activation.nin;
      payload.firstName = member.firstName;
      payload.lastName = member.lastName;
      payload.phoneNumber = activation.phoneNumber;
      payload.locationCode = activation.locationCode;

      // Generate an activation slug and record
      const newSlug = await GenerateActivationSlug.generate(activation.userUuid, payload, member, "ACTIVATION", 64);
      const activationUrl = `${backendUrl}/api/v1/user/chw/activate/${newSlug}`;

      // Send email to the CHW with their login credentials
      await EmailService.sendEmail({
        to: member.email,
        subject: "Kufungua Akaunti ya UCS/WAJA",
        text: `Hongera, umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kufungua akaunti yako ili uweze kutumia kishkwambi(Tablet) cha kazi: ${activationUrl}. Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji (${member.username}).`,
        html: `<h1><strong>Hongera!</strong></h1> <p>Umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kuhuisha akaunti yako ili uweze kutumia kishkwambi(Tablet) chako.</p>
                 <p><a href="${activationUrl}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Fungua Akaunti</a></p>
                 <p>Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji: <strong>(${member.username})</strong>.</p><br>`,
      });

      await ApiLogger.log(req, { statusCode: 200, body: { slug: newSlug, email: member.email, slugType: "Reactivation" } });
      console.log("🔄 Activation email resent successfully for slug: ", newSlug);
      return { alert: false, message: "Umetumiwa email mpya ya kuunda akaunti ya UCS.", slug: newSlug, login: false };
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }

  /**
   * Handle forgotten password
   * @param {Request} req - The request object containing the username
   * @param {Response} res - The response object
   * @param {NextFunction} next - The next middleware function
   * @returns {Promise<string>} - A message indicating the result of the operation
   * @throws {CustomError} - Throws a CustomError if there is an issue with the request
   * @description This method handles the forgotten password request for a user.
   */
  static async handleForgotPassword(req, res, next) {
    try {
      const { username } = req.params;
      if (!username) throw new CustomError("Username is required", 400);

      const member = await prisma.openMRSTeamMember.findFirst({
        where: { username },
      });
      if (!member) throw new CustomError("User not found", 404);

      // Check if the user has an active activation slug
      const activationStatus = await prisma.accountActivation.findFirst({
        where: {
          userUuid: member.userUuid,
          slugType: "ACTIVATION",
          isUsed: false,
          expiryDate: {
            gte: new Date(),
          },
        },
      });
      if (activationStatus) {
        throw new CustomError("You have an active activation request. Please activate your account first.", 400);
      }
      // Check if the user has an active password reset slug
      const passwordResetStatus = await prisma.accountActivation.findFirst({
        where: {
          userUuid: member.userUuid,
          slugType: "RESET",
          isUsed: false,
          expiryDate: {
            gte: new Date(),
          },
        },
      });
      if (passwordResetStatus) {
        throw new CustomError("You have an active password reset request. Please check your email.", 400);
      }

      // Generate new reset token for the member
      const resetPayload = {
        message: {
          body: [
            {
              email: member.email,
              NIN: member.NIN,
              firstName: member.firstName,
              lastName: member.lastName,
              phoneNumber: member.phoneNumber,
              locationCode: member.locationCode ?? null,
            },
          ],
        },
      };
      const resetToken = await GenerateActivationSlug.generate(member.userUuid, resetPayload, member, "RESET", 32);
      const resetUrl = `${backendUrl}/api/v1/user/chw/reset/${resetToken}`;

      // Send email to the member with the reset link
      await EmailService.sendEmail({
        to: member.email,
        subject: "Kubadili nenosiri la UCS/WAJA",
        text: `Kuweka nenosiri jipya la UCS/WAJA, tafadhali fuata linki hii: ${resetUrl}`,
        html: `<h1><strong>Badili Nenosiri</strong></h1> <p>Ili kubadilisha nenosiri unalotumia kweye UCS/WAJA tafadhali fuata linki hii:</p>
               <p><a href="${resetUrl}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Badili Nenosiri</a></p>`,
      });

      // Log the password reset request
      await ApiLogger.log(req, { statusCode: 200, body: { slug: resetToken, email: member.email } });
      console.log("🔄 Activation email resent successfully for slug: ", resetToken);

      return "Password reset email sent successfully";
    } catch (error) {
      // Log the error
      console.error("Error in handleForgotPassword: ", error.message);
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }

  /**
   * Create a new CHW account
   * @param {Request} req - The request object containing the CHW data
   * @param {Response} res - The response object
   * @param {NextFunction} next - The next middleware function
   * @returns {Promise<TeamMember>} - The created CHW account
   * @throws {CustomError} - Throws a CustomError if there is an issue with the request
   * @description This method handles the creation of a new CHW account.
   */
  static async createChwAccount(req, _res, _next) {
    console.log("🔄 Registering CHW from the frontend...");
    let newPerson = null;
    try {
      // Get the payload from the request body
      const payload = req.body;

      // Validate incoming CHW deployment payload
      // FrontendValidator.validateCreateChwPayload(payload);

      // Check if the CHW exists in team members by NIN
      const teamMember = await TeamMemberRepository.getTeamMemberByNin(payload.NIN);

      if (teamMember) {
        throw new CustomError("Duplicate CHW ID found.", 409);
      }

      // Check if the location exists
      const location = await OpenMRSLocationRepository.getLocationByHfrCode(payload.hfrCode);
      if (!location) {
        throw new CustomError("Invalid hfrCode.", 404);
      }

      // GET teamMemberLocation by location Code attribute
      const teamMemberLocation = await OpenMRSLocationRepository.getLocationByCode(payload.locationCode);
      if (!teamMemberLocation) {
        throw new CustomError("Invalid locationCode.", 404);
      }

      // Check if a team exists without location
      let team = await TeamRepository.getTeamByLocationUuid(location.uuid);

      if (!team) {
        // Create a new team and asign it to the team  object
        const newTeam = await TeamService.createTeam(location);
        team = newTeam;
      }

      // Create a new person in OpenMRS if team member does not exist by NIN
      const newPerson = await OpenMRSPersonHelper.createPersonWithAttributes(payload);

      // Create a new OpenMRS user
      const newUser = await OpenMRSUserHelper.create(payload, newPerson.uuid);

      if (!newUser || !newUser.uuid) {
        await openmrsApiClient.delete(`person/${newPerson.uuid}`);
        throw new CustomError("Failed to create OpenMRS user. Probable duplicate username", 500);
      }

      let newPayload = {};
      newPayload.message = {};
      newPayload.message.body = [];
      newPayload.message.body.push({
        uuid: newUser.uuid,
        username: newUser.username,
        password: payload.password,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        locationCode: payload.locationCode,
        hfrCode: payload.hfrCode,
        nin: payload.NIN,
        userUuid: newUser.uuid,
      });

      let validatedContent = {};
      validatedContent.teamMemberLocation = teamMemberLocation;
      validatedContent.team = team;

      // Create a new team member in OpenMRS and in local Repo
      const newTeamMember = await TeamMemberService.createTeamMember(newUser, newPayload, validatedContent, newPerson);
      console.log("✅ CHW registered successfuly.");

      // Generate an activation slug and record
      const slug = await GenerateActivationSlug.generate(newUser.uuid, newPayload, newTeamMember, "ACTIVATION", 32);
      const backendUrl = process.env.BACKEND_URL || "https://ucs.moh.go.tz";
      const activationUrl = `${backendUrl}/api/v1/user/chw/activate/${slug}`;

      // Send email to the CHW with their login credentials
      try {
        await EmailService.sendEmail({
          to: newTeamMember.email,
          subject: "Kufungua Akaunti ya UCS/WAJA",
          text: `Hongera, umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kufungua akaunti yako ili uweze kutumia kishkwambi(Tablet) cha kazi: ${activationUrl}. Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji (${newTeamMember.username}).`,
          html: `<h1><strong>Hongera!</strong></h1> <p>Umeandikishwa katika mfumo wa UCS. Tafadhali fuata linki hii kuweza kuhuisha akaunti yako ili uweze kutumia kishkwambi(Tablet) chako.</p>
             <p><a href="${activationUrl}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Fungua Akaunti</a></p>
             <p>Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji: <strong>(${newTeamMember.username})</strong>.</p><br>`,
        });
        console.log("✅ Email sent successfully to CHW");
      } catch (emailError) {
        console.error("❌ Failed to send email to CHW:", emailError.message);

        // Delete the created person and user when email sending fails
        if (newPerson && newPerson.uuid) {
          try {
            // Use OpenMRS API to delete the person
            await openmrsApiClient.delete(`person/${newPerson.uuid}`);
            console.log(`🗑️  Successfully deleted person with UUID: ${newPerson.uuid} due to email failure`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete person with UUID: ${newPerson.uuid}`, deleteError);
          }
        }

        // Throw the email error to be caught by the outer catch block
        throw new CustomError(`Failed to send activation email: ${emailError.message}`, 500);
      }
      // <hr><small>Majaribio: tumia password hii kwenye UAT: <span style="color:tomato">${newTeamMember.password}</span></small>`,

      // Log the entire brouhaha
      await ApiLogger.log(req, { member: newTeamMember, slug });
      return newTeamMember;
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      console.error("❌ Error while registering CHW from HRHIS:", error.message);

      // Rethrow with CustomError for the controller to catch
      throw new CustomError(error.message, error.statusCode || 400);
    }
  }

  /**
   * Get activation email metrics for CHW accounts.
   * Mirrors (and extends) stats from ucs-peers email settings.
   * @param {Object} [opts] - Optional filter by council
   * @param {string} [opts.region] - Region name (with district and council)
   * @param {string} [opts.district] - District name (with council)
   * @param {string} [opts.council] - Council name; when set, stats are scoped to that council only
   */
  static async getActivationEmailStats(opts = {}) {
    const now = new Date();
    const { council } = opts;

    let userUuidFilter = {};
    if (council) {
      const userUuids = await getCouncilUserUuids(council);
      userUuidFilter = userUuids.length > 0 ? { userUuid: { in: userUuids } } : { userUuid: "__NO_MATCH__" };
    }

    const baseWhere = { slugType: "ACTIVATION", ...userUuidFilter };

    const [unsentExpired, activated, expiredResent, openNotUsed, total, resentCount] = await Promise.all([
      prisma.accountActivation.count({
        where: {
          ...baseWhere,
          isUsed: false,
          isResent: false,
          expiryDate: { lt: now },
        },
      }),
      prisma.accountActivation.count({
        where: {
          ...baseWhere,
          isUsed: true,
        },
      }),
      prisma.accountActivation.count({
        where: {
          ...baseWhere,
          isResent: true,
          expiryDate: { lt: now },
        },
      }),
      prisma.accountActivation.count({
        where: {
          ...baseWhere,
          isUsed: false,
          expiryDate: { gte: now },
        },
      }),
      prisma.accountActivation.count({
        where: baseWhere,
      }),
      prisma.accountActivation.count({
        where: {
          ...baseWhere,
          isResent: true,
        },
      }),
    ]);

    return {
      unsentExpired,
      activated,
      expiredResent,
      openNotUsed,
      total,
      resentCount,
    };
  }

  /**
   * Resend activation emails for expired, never-resent activations (single batch).
   * When locationFilter.council is set, only activations for team members in that council (MySQL) are included.
   * Returns a summary object { total, success, failed }.
   */
  static async resendExpiredActivationsBatch(limit = 100, locationFilter = null) {
    const now = new Date();
    const batchSize = Number(limit) > 0 ? Number(limit) : 100;

    let userUuidFilter = {};
    if (locationFilter?.council) {
      const userUuids = await getCouncilUserUuids(locationFilter.council);
      if (userUuids.length === 0) {
        return { total: 0, success: 0, failed: 0 };
      }
      userUuidFilter = { userUuid: { in: userUuids } };
    }

    const toResend = await prisma.accountActivation.findMany({
      where: {
        slugType: "ACTIVATION",
        isUsed: false,
        isResent: false,
        expiryDate: { lt: now },
        email: {
          not: null,
          not: "",
        },
        ...userUuidFilter,
      },
      take: batchSize,
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`🔄 Manual expired-activation resend batch: found ${toResend.length} records to process (limit=${batchSize})`);

    let success = 0;
    let failed = 0;

    for (const activation of toResend) {
      try {
        await resendActivationCron.resendActivationEmail(activation);
        success++;
      } catch (err) {
        failed++;
        console.error("❌ Error resending expired activation in batch:", err?.message || err);
      }
    }

    return {
      total: toResend.length,
      success,
      failed,
    };
  }

  /**
   * Resend activation emails for open (non-expired), not-used activations.
   * When locationFilter.council is set, only activations for team members in that council (MySQL) are included.
   */
  static async resendOpenActivationsBatch(limit = 100, locationFilter = null) {
    const now = new Date();
    const batchSize = Number(limit) > 0 ? Number(limit) : 100;

    let userUuidFilter = {};
    if (locationFilter?.council) {
      const userUuids = await getCouncilUserUuids(locationFilter.council);
      if (userUuids.length === 0) {
        return { total: 0, success: 0, failed: 0 };
      }
      userUuidFilter = { userUuid: { in: userUuids } };
    }

    const toResend = await prisma.accountActivation.findMany({
      where: {
        slugType: "ACTIVATION",
        isUsed: false,
        expiryDate: { gte: now },
        email: {
          not: null,
          not: "",
        },
        ...userUuidFilter,
      },
      take: batchSize,
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`🔄 Manual open-activation resend batch: found ${toResend.length} records to process (limit=${batchSize})`);

    let success = 0;
    let failed = 0;

    for (const activation of toResend) {
      try {
        await resendActivationCron.resendActivationEmail(activation);
        success++;
      } catch (err) {
        failed++;
        console.error("❌ Error resending open activation in batch:", err?.message || err);
      }
    }

    return {
      total: toResend.length,
      success,
      failed,
    };
  }

  /**
   * Get paginated council members from MySQL (for "View all members" dialog).
   * @param {string} council - Council name
   * @param {number} page - 1-based page
   * @param {number} limit - Page size
   */
  static async getActivationCouncilMembers(council, page = 1, limit = 20) {
    return getCouncilMembersPaginated(council, page, limit);
  }

  /**
   * Build a day-level activation matrix (GitHub-style) for the last N days.
   * Counts ACTIVATION slugs created per day.
   */
  static async getActivationMatrix(days = 90) {
    const windowDays = Number(days) > 0 ? Number(days) : 90;

    // Use raw SQL to aggregate by day on created_at
    const rows = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "createdAt")::date AS date,
        COUNT(*)::int AS count
      FROM "account_activations"
      WHERE "slugType" = 'ACTIVATION'
        AND "createdAt" >= (CURRENT_DATE - ${windowDays}::int)
      GROUP BY date
      ORDER BY date ASC
    `;

    // Normalize to a simple { date: 'YYYY-MM-DD', count } array
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      count: Number(r.count) || 0,
    }));
  }
}

export default UserService;
