import prisma from "../../config/prisma.js";
import BaseResponse from "../../responders/base-responder.js";
import CustomError from "../../utils/custom-error.js";
import EmailService from "../../utils/email-service.js";
import {
  emailProviderHealth,
  getEmailRuntime,
  recentEmailDispatches,
  updateEmailRuntime,
} from "../../utils/email-runtime-settings.js";

function actorLabel(req) {
  const email = req.user?.email;
  const name = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" ");
  return email || name || req.user?.id || null;
}

async function activationSnapshot() {
  const now = new Date();
  const [open, expired, resent, activated] = await Promise.all([
    prisma.accountActivation.count({
      where: { slugType: "ACTIVATION", isUsed: false, expiryDate: { gte: now } },
    }),
    prisma.accountActivation.count({
      where: { slugType: "ACTIVATION", isUsed: false, isResent: false, expiryDate: { lt: now } },
    }),
    prisma.accountActivation.count({
      where: { slugType: "ACTIVATION", isResent: true, isUsed: false },
    }),
    prisma.accountActivation.count({
      where: { slugType: "ACTIVATION", isUsed: true },
    }),
  ]);
  return { open, expired, resent, activated };
}

class EmailControlController {
  static async getSettings(req, res, next) {
    try {
      const [runtime, activity, stats] = await Promise.all([
        getEmailRuntime(),
        recentEmailDispatches({ page: req.query?.page, pageSize: req.query?.pageSize }),
        activationSnapshot(),
      ]);
      return BaseResponse.success(res, "Email control loaded", {
        ...runtime,
        health: emailProviderHealth(),
        stats,
        activity: activity.rows,
        activityPage: {
          page: activity.page,
          pageSize: activity.pageSize,
          total: activity.total,
          totalPages: activity.totalPages,
        },
      });
    } catch (error) {
      next(error instanceof CustomError ? error : new CustomError(error.message, 500));
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const { allowSending, provider } = req.body || {};
      if (allowSending !== undefined && typeof allowSending !== "boolean") {
        throw new CustomError("allowSending must be true or false.", 400);
      }
      if (provider !== undefined && provider !== "gmail" && provider !== "ega") {
        throw new CustomError("provider must be gmail or ega.", 400);
      }
      if (allowSending === undefined && provider === undefined) {
        throw new CustomError("Nothing to update.", 400);
      }
      const saved = await updateEmailRuntime({
        allowSending,
        provider,
        updatedBy: actorLabel(req),
      });
      if (saved.provider) EmailService.switchProvider(saved.provider);
      return BaseResponse.success(res, "Email control updated", {
        ...saved,
        health: emailProviderHealth(),
      });
    } catch (error) {
      next(error instanceof CustomError ? error : new CustomError(error.message, 500));
    }
  }

  static async sendTest(req, res, next) {
    try {
      const to = String(req.body?.to || req.user?.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        throw new CustomError("Enter a valid test recipient.", 400);
      }
      const runtime = await getEmailRuntime();
      const info = await EmailService.sendEmail({
        to,
        subject: "UCS iCCHW email control test",
        text: runtime.allowSending
          ? "This is a live test from Settings → Email Control. Email sending is on."
          : "This message was simulated because email sending is off.",
        html: `<p>This is a test from <strong>Settings → Email Control</strong>.</p><p>Sending is <strong>${runtime.allowSending ? "on" : "off"}</strong> and the provider is <strong>${runtime.provider}</strong>.</p>`,
      });
      return BaseResponse.success(res, info.simulated ? "Test email simulated" : "Test email sent", {
        to,
        simulated: Boolean(info.simulated),
        provider: runtime.provider,
      });
    } catch (error) {
      next(error instanceof CustomError ? error : new CustomError(error.message, 500));
    }
  }
}

export default EmailControlController;
