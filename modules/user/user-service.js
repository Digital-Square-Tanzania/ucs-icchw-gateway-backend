import bcrypt from "bcryptjs";
import UserRepository from "./user-repository.js";
import CustomError from "../../utils/custom-error.js";
import prisma from "../../config/prisma.js";
import ApiLogger from "../../utils/api-logger.js";
import openmrsApiClient from "../openmrs/openmrs-api-client.js";
import EmailService from "../../utils/email-service.js";
import GenerateActivationSlug from "../../utils/generate-activation-slug.js";

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
    const activation = await prisma.accountActivation.findUnique({
      where: {
        slug,
      },
    });
    const member = await prisma.openMRSTeamMember.findUnique({
      where: { userUuid: activation.userUuid },
    });

    if (!member) return { alert: true, message: "Kiungo ulichotumia sio sahihi.", slug, login: false };
    if (password !== confirmPassword) {
      return { alert: true, message: "Password ulizoingiza hazifanani.", slug, login: true, username: member.username };
    }

    if (!activation || activation.isUsed || Date.now() > new Date(activation.expiryDate)) {
      return { alert: true, message: "Muda wa kuwasha akaunti umepitiliza.", slug, login: false };
    }

    // ✅ Hash password and activate account
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update OpenMRS password
    const openmrsUser = await openmrsApiClient.post(`user/${activation.userUuid}`, {
      password: hashedPassword,
    });
    if (!openmrsUser) {
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
  }

  // Handle email resending
  static async handleResendEmail(req, res, next) {
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
      if (Date.now() < activation.expiryDate) return { alert: true, message: "Linki uliuoutumiwa awali ipo sawa, itumie.", slug, login: true, resend: false };
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
      if (openSlugs.length > 0) return { alert: true, message: "Tumia linki mpya uliyotumiwa kwenye email.", slug, login: false, resend: false };
      console.log("🔄 Valid email resend request received, resending the email for slug: ", slug);

      // Generate an activation slug and record
      const newSlug = await GenerateActivationSlug.generate(activation.userUuid, "ACTIVATION", 64);
      const backendUrl = process.env.BACKEND_URL || "https://ucs.moh.go.tz";
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

      await ApiLogger.log(req, { statusCode: 200, body: { slug: newSlug, email: member.email } });
      console.log("🔄 Activation email resent successfully for slug: ", newSlug);
      return { alert: false, message: "Umetumiwa email mpya ya kuunda akaunti ya UCS.", slug: newSlug, login: false };
    } catch (error) {
      await ApiLogger.log(req, { statusCode: error.statusCode || 500, body: error.message });
      throw new CustomError(error.message, error.status || 500);
    }
  }
}

export default UserService;
