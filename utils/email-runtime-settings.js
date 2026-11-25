import prisma from "../config/prisma.js";
import logger from "./logger.js";

const CACHE_MS = 2000;
let cache = null;
let cacheAt = 0;

function envDefaults() {
  const allowRaw = String(process.env.ALLOW_EMAIL_SENDING || "").trim().toLowerCase();
  const allowSending = allowRaw === "true" || allowRaw === "1" || allowRaw === "yes";
  const provider = String(process.env.EMAIL_PROVIDER || "gmail").trim().toLowerCase() === "ega" ? "ega" : "gmail";
  return { allowSending, provider };
}

export function invalidateEmailRuntimeCache() {
  cache = null;
  cacheAt = 0;
}

function present(value) {
  return Boolean(String(value || "").replace(/^["']|["']$/g, "").trim());
}

export function emailProviderHealth() {
  const gmailUser = present(process.env.EMAIL_USERNAME);
  const gmailPass = present(process.env.EMAIL_PASSWORD);
  const egaHost = present(process.env.EGA_SMTP_HOST);
  const egaUser = present(process.env.EGA_EMAIL_ADDRESS);
  const egaPass = present(process.env.EGA_EMAIL_PASSWORD);
  const authRequired = process.env.EGA_SMTP_AUTH_REQUIRED !== "false";
  return {
    gmailConfigured: gmailUser && gmailPass,
    egaConfigured: egaHost && (!authRequired || (egaUser && egaPass)),
    gmailFrom: String(process.env.EMAIL_FROM || "iCCHW-WAJA").replace(/^["']|["']$/g, "").trim(),
    egaFromName: String(process.env.EGA_EMAIL_DISPLAY_NAME || "UCS System").replace(/^["']|["']$/g, "").trim(),
    egaHost: String(process.env.EGA_SMTP_HOST || "").replace(/^["']|["']$/g, "").trim() || null,
  };
}

export async function getEmailRuntime() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const defaults = envDefaults();
  try {
    let row = await prisma.emailRuntimeSetting.findUnique({ where: { id: 1 } });
    if (!row) {
      row = await prisma.emailRuntimeSetting.create({
        data: { id: 1, allowSending: defaults.allowSending, provider: defaults.provider },
      });
    }
    const provider = row.provider === "ega" ? "ega" : "gmail";
    cache = {
      allowSending: Boolean(row.allowSending),
      provider,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      envAllowSending: defaults.allowSending,
      envProvider: defaults.provider,
      persisted: true,
    };
    cacheAt = Date.now();
    return cache;
  } catch (error) {
    logger.warn?.(`[email-runtime] Using environment defaults: ${error?.message || error}`);
    return {
      ...defaults,
      updatedAt: null,
      updatedBy: null,
      envAllowSending: defaults.allowSending,
      envProvider: defaults.provider,
      persisted: false,
    };
  }
}

export async function updateEmailRuntime({ allowSending, provider, updatedBy }) {
  const current = await getEmailRuntime();
  const nextProvider = provider === "ega" || provider === "gmail" ? provider : current.provider;
  const nextAllow = typeof allowSending === "boolean" ? allowSending : current.allowSending;
  const row = await prisma.emailRuntimeSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      allowSending: nextAllow,
      provider: nextProvider,
      updatedBy: updatedBy || null,
    },
    update: {
      allowSending: nextAllow,
      provider: nextProvider,
      updatedBy: updatedBy || null,
    },
  });
  invalidateEmailRuntimeCache();
  return {
    allowSending: row.allowSending,
    provider: row.provider === "ega" ? "ega" : "gmail",
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    persisted: true,
  };
}

export async function recordEmailDispatch({ to, subject, provider, mode, detail }) {
  try {
    await prisma.emailDispatchLog.create({
      data: {
        toAddress: String(to || "").slice(0, 320),
        subject: String(subject || "").slice(0, 300),
        provider: provider === "ega" ? "ega" : "gmail",
        mode,
        detail: detail ? String(detail).slice(0, 500) : null,
      },
    });
    const oldestKept = await prisma.emailDispatchLog.findMany({
      orderBy: { id: "desc" },
      skip: 49,
      take: 1,
      select: { id: true },
    });
    if (oldestKept[0]) {
      await prisma.emailDispatchLog.deleteMany({ where: { id: { lt: oldestKept[0].id } } });
    }
  } catch (error) {
    logger.warn?.(`[email-runtime] Could not record dispatch: ${error?.message || error}`);
  }
}

export async function recentEmailDispatches(limit = 20) {
  try {
    const rows = await prisma.emailDispatchLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      to: row.toAddress,
      subject: row.subject,
      provider: row.provider,
      mode: row.mode,
      detail: row.detail,
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}
