import { Cron } from "croner";
import prisma from "../config/prisma.js";
import EmailService from "./email-service.js";
import GenerateActivationSlug from "./generate-activation-slug.js";
import CustomError from "./custom-error.js";
import ApiLogger from "./api-logger.js";

class ResendActivationCron {
  constructor() {
    this.cronJob = null;
  }

  /**
   * Start the daily cron job that runs just before midnight (23:55)
   */
  start() {
    console.log("🕐 Starting resend activation cron job...");

    // Run daily at 23:55 (just before midnight)
    this.cronJob = Cron(
      "55 23 * * *",
      {
        timezone: "Africa/Dar_es_Salaam",
        catch: true,
      },
      async () => {
        try {
          console.log("🔄 Starting daily resend activation cron job...");
          await this.resendExpiredActivations();
          console.log("✅ Daily resend activation cron job completed.");
        } catch (error) {
          console.error("❌ Error in resend activation cron job:", error);
        }
      }
    );

    console.log("✅ Resend activation cron job scheduled for 23:55 daily (Africa/Dar_es_Salaam timezone)");
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log("🛑 Resend activation cron job stopped.");
    }
  }

  /**
   * Resend activation emails for expired records
   */
  async resendExpiredActivations() {
    try {
      console.log("🔄 Looking for expired activation records to resend...");

      // Find the first 500 AccountActivation records that meet the criteria
      const expiredActivations = await prisma.accountActivation.findMany({
        where: {
          slugType: "ACTIVATION",
          isUsed: false,
          isResent: false,
          expiryDate: {
            lt: new Date(), // expiryDate is before current time
          },
          email: {
            not: null,
            not: "",
          },
        },
        take: 500,
        orderBy: {
          createdAt: "asc", // Process oldest first
        },
      });

      console.log(`📧 Found ${expiredActivations.length} expired activation records to resend`);

      if (expiredActivations.length === 0) {
        console.log("✅ No expired activation records found to resend.");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each expired activation
      for (const activation of expiredActivations) {
        try {
          await this.resendActivationEmail(activation);
          successCount++;
          console.log(`✅ Resent activation email for user: ${activation.userUuid}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to resend activation email for user ${activation.userUuid}:`, error.message);

          // Log the error
          await ApiLogger.log(null, {
            statusCode: 500,
            body: `Failed to resend activation email: ${error.message}`,
            userUuid: activation.userUuid,
            activationId: activation.id,
          });
        }
      }

      console.log(`📊 Resend activation summary: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error("❌ Error in resendExpiredActivations:", error);
      throw new CustomError("Failed to resend expired activations: " + error.message, 500);
    }
  }

  /**
   * Resend activation email for a specific activation record
   */
  async resendActivationEmail(activation) {
    try {
      // Get the team member details
      const teamMember = await prisma.openMRSTeamMember.findUnique({
        where: { userUuid: activation.userUuid },
      });

      if (!teamMember) {
        throw new CustomError(`Team member not found for userUuid: ${activation.userUuid}`, 404);
      }

      // Generate a new activation slug
      const newSlug = await GenerateActivationSlug.generate(
        activation.userUuid,
        {
          email: activation.email,
          nin: activation.nin,
          firstName: teamMember.firstName,
          lastName: teamMember.lastName,
          phoneNumber: activation.phoneNumber,
          locationCode: activation.locationCode,
        },
        teamMember,
        "ACTIVATION",
        32
      );

      const backendUrl = process.env.BACKEND_URL || "https://ucs.moh.go.tz";
      const activationUrl = `${backendUrl}/api/v1/user/chw/activate/${newSlug}`;

      // Send the resend email
      await EmailService.sendEmail({
        to: activation.email,
        subject: "Kufungua Akaunti ya UCS/WAJA - Kumbuka",
        text: `Hujambo, akaunti yako ya UCS bado haijafunguliwa. Tafadhali fuata linki hii kuweza kufungua akaunti yako ili uweze kutumia kishkwambi(Tablet) cha kazi: ${activationUrl}. Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji (${teamMember.username}).`,
        html: `
          <h1><strong>Kumbuka!</strong></h1>
          <p>Akaunti yako ya UCS bado haijafunguliwa. Tafadhali fuata linki hii kuweza kuhuisha akaunti yako ili uweze kutumia kishkwambi(Tablet) chako.</p>
          <p><a href="${activationUrl}" style="color:#2596be; text-decoration:underline; font-size:1.1rem;">Fungua Akaunti</a></p>
          <p>Upatapo kishkwambi chako, tumia namba yako ya simu kama jina la mtumiaji: <strong>(${teamMember.username})</strong>.</p>
          <br>
          <p><small>Hii ni kumbuka kutoka kwa mfumo wa UCS.</small></p>
        `,
      });

      // Mark the original activation as resent
      await prisma.accountActivation.update({
        where: { id: activation.id },
        data: { isResent: true },
      });

      // Log the resend action
      await ApiLogger.log(null, {
        action: "RESEND_ACTIVATION",
        userUuid: activation.userUuid,
        originalActivationId: activation.id,
        newSlug: newSlug,
        email: activation.email,
      });
    } catch (error) {
      console.error(`❌ Error resending activation email for user ${activation.userUuid}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger the resend process (for testing or manual execution)
   */
  async manualResend() {
    console.log("🔄 Manually triggering resend activation process...");
    await this.resendExpiredActivations();
  }
}

// Create and export a singleton instance
const resendActivationCron = new ResendActivationCron();

export default resendActivationCron;
