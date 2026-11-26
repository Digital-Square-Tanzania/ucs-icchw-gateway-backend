import prisma from "../config/prisma.js";

const TRUE_WORDS = new Set(["true", "1", "yes", "y", "eligible"]);
const FALSE_WORDS = new Set([
  "false",
  "0",
  "no",
  "n",
  "ineligible",
  "not_eligible",
  "not eligible",
  "not-eligible",
]);

let loggedUnknownShape = false;

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return null;
}

function headerValue(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === wanted) return value;
  }
  return null;
}

function clip(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.slice(0, 500);
}

export function classifyPartnerCall(url) {
  const path = String(url || "");
  if (path.includes("/chw/status")) return { source: "FFARS", operation: "eligibility" };
  if (path.includes("/chw/register")) return { source: "HRHIS", operation: "register" };
  if (path.includes("/chw/update")) return { source: "HRHIS", operation: "update" };
  if (path.includes("/chw/station")) return { source: "HRHIS", operation: "station" };
  return null;
}

function flagFromValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (value && typeof value === "object") {
    return flagFromValue(value.status ?? value.value ?? value.eligible ?? value.result);
  }
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (TRUE_WORDS.has(text)) return true;
  if (FALSE_WORDS.has(text)) return false;
  return null;
}

function fieldValue(item, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(item)) {
    if (wanted.has(String(key).toLowerCase())) return value;
  }
  return undefined;
}

function eligibilityFlag(row) {
  const item = asObject(row) || {};
  const groups = [
    ["eligible", "isEligible", "is_eligible", "paymentEligible", "payment_eligible"],
    ["eligibilityStatus", "eligibility_status", "eligibility", "paymentStatus", "payment_status"],
  ];
  for (const names of groups) {
    const flag = flagFromValue(fieldValue(item, names));
    if (flag !== null) return flag;
  }
  return null;
}

export function summarizeEligibility(list) {
  const rows = Array.isArray(list) ? list : [];
  let eligibleCount = 0;
  let ineligibleCount = 0;
  let unknownCount = 0;
  for (const row of rows) {
    const flag = eligibilityFlag(row);
    if (flag === true) eligibleCount += 1;
    else if (flag === false) ineligibleCount += 1;
    else {
      unknownCount += 1;
      if (!loggedUnknownShape && row && typeof row === "object") {
        loggedUnknownShape = true;
        console.log("FFARS eligibility row had no recognized eligible flag. Keys:", Object.keys(row));
      }
    }
  }
  return {
    chwCount: rows.length,
    eligibleCount,
    ineligibleCount,
    unknownCount,
  };
}

function requestBody(request) {
  return request?.body?.message?.body;
}

function facilityCodeFrom(request, kind) {
  const body = requestBody(request);
  if (kind.operation === "eligibility") {
    const obj = asObject(body) || {};
    return String(obj.FacilityCode || obj.facilityCode || "").trim() || null;
  }
  const chw = Array.isArray(body) ? body[0] : body;
  const obj = asObject(chw) || {};
  return String(obj.hfrCode || obj.FacilityCode || obj.facilityCode || "").trim() || null;
}

function periodFrom(request) {
  const body = requestBody(request);
  const obj = Array.isArray(body) ? {} : asObject(body) || {};
  const month = Number(obj.month);
  const year = Number(obj.year);
  return {
    periodMonth: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null,
    periodYear: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null,
  };
}

function chwCountFromRequest(request) {
  const body = requestBody(request);
  if (Array.isArray(body)) return body.length;
  if (body && typeof body === "object") return 1;
  return 0;
}

function outcomeFrom(response, kind) {
  const status = Number(response?.status) || 200;
  const envelope = asObject(response?.body)?.message;
  const body = envelope?.body;
  if (kind.operation === "eligibility") {
    const error = asObject(body)?.error;
    const failed = Boolean(error) || status >= 400;
    const message = error?.message || (failed ? asObject(body)?.message : null);
    const httpStatus = failed ? Number(error?.statusCode) || (status >= 400 ? status : 500) : status;
    return {
      outcome: failed ? "failed" : "succeeded",
      httpStatus,
      errorMessage: failed ? clip(message) : null,
    };
  }
  const statusText = String(asObject(body)?.status || "").toLowerCase();
  const failed = status >= 400 || statusText === "fail" || statusText === "failed" || statusText === "error";
  const message = failed ? asObject(body)?.message : null;
  return {
    outcome: failed ? "failed" : "succeeded",
    httpStatus: status,
    errorMessage: failed ? clip(typeof message === "string" ? message : message ? JSON.stringify(message) : "") : null,
  };
}

/**
 * Flat facts for one api_logs row. Returns null when the log is not an inbound partner envelope.
 */
export function buildPartnerApiCall(apiLog) {
  const request = asObject(apiLog?.request);
  const response = asObject(apiLog?.response);
  if (!request || !response || !apiLog?.id) return null;
  if (headerValue(request.headers, "x-ucs-recovery-source")) return null;
  if (asObject(response.body)?.recovery) return null;

  const kind = classifyPartnerCall(request.url);
  if (!kind) return null;
  const envelope = asObject(response.body)?.message;
  if (!envelope) return null;

  const period = periodFrom(request);
  const counts =
    kind.operation === "eligibility" && Array.isArray(envelope.body)
      ? summarizeEligibility(envelope.body)
      : {
          chwCount: chwCountFromRequest(request),
          eligibleCount: 0,
          ineligibleCount: 0,
          unknownCount: 0,
        };
  const result = outcomeFrom(response, kind);

  return {
    apiLogId: Number(apiLog.id),
    source: kind.source,
    operation: kind.operation,
    receivedAt: apiLog.createdAt ? new Date(apiLog.createdAt) : new Date(),
    httpStatus: result.httpStatus,
    outcome: result.outcome,
    facilityCode: facilityCodeFrom(request, kind),
    facilityName: null,
    periodMonth: period.periodMonth,
    periodYear: period.periodYear,
    chwCount: counts.chwCount,
    eligibleCount: result.outcome === "succeeded" ? counts.eligibleCount : 0,
    ineligibleCount: result.outcome === "succeeded" ? counts.ineligibleCount : 0,
    unknownCount: result.outcome === "succeeded" ? counts.unknownCount : 0,
    errorMessage: result.errorMessage,
  };
}

async function facilityName(code) {
  if (!code) return null;
  const row = await prisma.openMRSLocation.findFirst({
    where: { hfrCode: code, retired: false },
    select: { name: true },
    orderBy: { locationId: "asc" },
  });
  return row?.name || null;
}

/** Recompute eligible and ineligible counts from the stored FFARS payload. */
export async function recountFfarsEligibility() {
  const calls = await prisma.partnerApiCall.findMany({
    where: { source: "FFARS", operation: "eligibility" },
    select: { id: true, apiLogId: true },
  });
  let updated = 0;
  for (const call of calls) {
    const log = await prisma.apiLog.findUnique({ where: { id: call.apiLogId } });
    const built = buildPartnerApiCall(log);
    if (!built) continue;
    await prisma.partnerApiCall.update({
      where: { id: call.id },
      data: {
        chwCount: built.chwCount,
        eligibleCount: built.eligibleCount,
        ineligibleCount: built.ineligibleCount,
        unknownCount: built.unknownCount,
      },
    });
    updated += 1;
  }
  console.log(`FFARS eligibility recount updated ${updated} call(s).`);
  return { updated };
}

export async function capturePartnerApiCall(apiLog) {
  const data = buildPartnerApiCall(apiLog);
  if (!data) return null;
  try {
    data.facilityName = await facilityName(data.facilityCode);
  } catch (error) {
    console.error("Facility name lookup failed:", error.message);
  }
  try {
    return await prisma.partnerApiCall.create({ data });
  } catch (error) {
    if (error?.code === "P2002") return null;
    console.error("Failed to store partner API call:", error.message);
    return null;
  }
}
