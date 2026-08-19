import prisma from "../../config/prisma.js";
import CustomError from "../../utils/custom-error.js";
import HrhisLocationRecoveryService from "./hrhis-location-recovery-service.js";

const RECOVERY_SOURCE = "hrhis-location-recovery";
const MAX_TABLE_ROWS = 500;

function extractChwFromRequest(request) {
  const body = request?.body?.message?.body;
  return Array.isArray(body) ? body[0] || {} : body || {};
}

function chwDisplayName(chw) {
  return [chw?.firstName, chw?.middleName, chw?.lastName].filter(Boolean).join(" ").trim() || null;
}

function pickNewValues(chw, updatedFields = []) {
  if (!updatedFields?.length) return {};
  const out = {};
  for (const field of updatedFields) {
    if (field in chw && chw[field] !== undefined && chw[field] !== null && chw[field] !== "") {
      out[field] = chw[field];
    }
  }
  return out;
}

function parseJsonField(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function formatFieldChanges(fieldChanges, chw, updatedFields = []) {
  const parsed = parseJsonField(fieldChanges, null);
  if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
    return parsed;
  }
  const newValues = pickNewValues(chw, updatedFields);
  const legacy = {};
  for (const field of updatedFields) {
    legacy[field] = { old: null, new: newValues[field] ?? null };
  }
  return legacy;
}

class HrhisCouncilAnalyticsService {
  /**
   * Council-scoped HRHIS /chw/register analytics from api_logs.
   * Uses GatewayResponder envelope rows for HTTP outcomes (one row per attempt)
   * and internal action rows for field-level update detail.
   */
  static async getCouncilAnalytics({ region, district, council, days = 90 } = {}) {
    const prefixes = await HrhisLocationRecoveryService.resolveCouncilPrefixes(region, district, council);
    const dayCount = Math.min(365, Math.max(1, Number.parseInt(String(days), 10) || 90));

    const [envelopeRows, internalRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          id,
          uuid,
          "createdAt",
          request,
          response,
          COALESCE(
            request->'body'->'message'->'body'->0->>'locationCode',
            request->'body'->'message'->'body'->>'locationCode'
          ) AS location_code,
          COALESCE(
            request->'body'->'message'->'body'->0->>'NIN',
            request->'body'->'message'->'body'->>'NIN'
          ) AS nin,
          COALESCE(request->'body'->'message'->'body'->0->>'hfrCode', '') AS hfr_code,
          LOWER(COALESCE(response->'body'->'message'->'body'->>'status', '')) AS outcome,
          COALESCE(NULLIF(response->>'status', '')::int, 0) AS http_status,
          COALESCE(response->'body'->'recovery'->>'source', '') AS recovery_source,
          response->>'recoveredAt' AS recovered_at,
          response->>'resolvedAt' AS resolved_at,
          COALESCE(
            response->'body'->'message'->'body'->>'message',
            CASE WHEN jsonb_typeof(response->'body') = 'string' THEN response->>'body' ELSE NULL END,
            response->'body'->>'body',
            ''
          ) AS err_msg
        FROM api_logs
        WHERE "createdAt" >= CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day')
          AND COALESCE(request->>'url', '') ILIKE '%/chw/register%'
          AND response->'body'->'message'->'body' IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT 10000
      `,
      prisma.$queryRaw`
        SELECT
          id,
          uuid,
          "createdAt",
          request,
          response,
          COALESCE(
            request->'body'->'message'->'body'->0->>'locationCode',
            request->'body'->'message'->'body'->>'locationCode'
          ) AS location_code,
          COALESCE(
            request->'body'->'message'->'body'->0->>'NIN',
            request->'body'->'message'->'body'->>'NIN',
            response->'body'->>'nin'
          ) AS nin,
          COALESCE(response->'body'->>'action', '') AS action,
          response->'body'->'updatedFields' AS updated_fields,
          response->'body'->'fieldChanges' AS field_changes
        FROM api_logs
        WHERE "createdAt" >= CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day')
          AND COALESCE(request->>'url', '') ILIKE '%/chw/register%'
          AND COALESCE(response->'body'->>'action', '') IN (
            'REGISTER_AS_UPDATE',
            'REGISTER_PURGE_ORPHAN_AND_RECREATE',
            'UPDATE_DEMOGRAPHICS'
          )
        ORDER BY "createdAt" DESC
        LIMIT 5000
      `,
    ]);

    const inCouncil = (row) =>
      HrhisLocationRecoveryService.locationCodeMatchesPrefixes(row.location_code, prefixes);

    const scopedEnvelope = (Array.isArray(envelopeRows) ? envelopeRows : []).filter(inCouncil);
    const scopedInternal = (Array.isArray(internalRows) ? internalRows : []).filter(inCouncil);

    const liveRows = scopedEnvelope.filter((r) => r.recovery_source !== RECOVERY_SOURCE);
    const recoveryRows = scopedEnvelope.filter((r) => r.recovery_source === RECOVERY_SOURCE);

    const isSuccess = (r) =>
      r.outcome === "success" || (r.outcome !== "fail" && r.http_status >= 200 && r.http_status < 400);
    const isFailure = (r) => r.outcome === "fail" || r.http_status >= 400;

    const succeeded = liveRows.filter(isSuccess);
    const failed = liveRows.filter(isFailure);
    const failedOpen = failed.filter((r) => !r.recovered_at);
    const recovered = recoveryRows.filter(isSuccess);

    const created = succeeded.filter((r) => r.http_status === 201);
    const updatedViaRegister = succeeded.filter((r) => r.http_status === 200);

    const ninCounts = new Map();
    for (const row of liveRows) {
      const nin = String(row.nin || "").trim();
      if (!nin) continue;
      ninCounts.set(nin, (ninCounts.get(nin) || 0) + 1);
    }
    const duplicateSubmissions = [...ninCounts.values()].filter((c) => c > 1).reduce((a, c) => a + (c - 1), 0);
    const uniqueNins = ninCounts.size;

    const accepted = succeeded.slice(0, MAX_TABLE_ROWS).map((row) => {
      const chw = extractChwFromRequest(row.request);
      return {
        logId: Number(row.id),
        logUuid: row.uuid,
        createdAt: row.createdAt,
        nin: row.nin,
        name: chwDisplayName(chw),
        locationCode: row.location_code,
        hfrCode: row.hfr_code || chw.hfrCode || null,
        httpStatus: Number(row.http_status) || null,
        kind: row.http_status === 201 ? "create" : row.http_status === 200 ? "update" : "success",
        message: row.err_msg || null,
      };
    });

    const rejected = failedOpen.slice(0, MAX_TABLE_ROWS).map((row) => {
      const chw = extractChwFromRequest(row.request);
      return {
        logId: Number(row.id),
        logUuid: row.uuid,
        createdAt: row.createdAt,
        nin: row.nin,
        name: chwDisplayName(chw),
        locationCode: row.location_code,
        hfrCode: row.hfr_code || chw.hfrCode || null,
        httpStatus: Number(row.http_status) || null,
        errorMessage: row.err_msg || "Unknown error",
        recoveredAt: row.recovered_at || null,
      };
    });

    const updatesByNin = new Map();
    for (const row of scopedInternal) {
      const nin = String(row.nin || "").trim();
      if (!nin) continue;
      if (!updatesByNin.has(nin)) updatesByNin.set(nin, []);
      updatesByNin.get(nin).push(row);
    }

    const updates = [];
    for (const [nin, rows] of updatesByNin.entries()) {
      const sorted = rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      sorted.forEach((row, index) => {
        const chw = extractChwFromRequest(row.request);
        let updatedFields = parseJsonField(row.updated_fields, []);
        if (!Array.isArray(updatedFields)) updatedFields = [];

        const fieldChanges = formatFieldChanges(row.field_changes, chw, updatedFields);
        const newValues = pickNewValues(chw, updatedFields);

        updates.push({
          logId: Number(row.id),
          logUuid: row.uuid,
          createdAt: row.createdAt,
          nin,
          name: chwDisplayName(chw),
          locationCode: row.location_code,
          action: row.action,
          updateNumber: index + 1,
          totalUpdatesForNin: sorted.length,
          updatedFields,
          fieldChanges,
          newValues,
          note:
            Object.values(fieldChanges).some((change) => change?.old != null)
              ? "Old and new values captured at update time."
              : updatedFields.length > 0
                ? "Historical log: only new values available from the incoming payload."
                : "No field changes recorded for this update.",
        });
      });
    }
    updates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const updatesLimited = updates.slice(0, MAX_TABLE_ROWS);

    const duplicates = [...ninCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([nin, submissionCount]) => {
        const rows = liveRows
          .filter((r) => String(r.nin || "").trim() === nin)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const openCount = rows.filter((r) => !r.resolved_at).length;
        const resolvedCount = rows.length - openCount;
        return {
          nin,
          submissionCount,
          openCount,
          resolvedCount,
          firstAt: rows[0]?.createdAt || null,
          lastAt: rows[rows.length - 1]?.createdAt || null,
        };
      })
      .sort((a, b) => b.submissionCount - a.submissionCount)
      .slice(0, MAX_TABLE_ROWS);

    return {
      scope: {
        region: region?.trim(),
        district: district?.trim(),
        council: council?.trim(),
        days: dayCount,
        councilPrefixes: prefixes,
      },
      summary: {
        incomingRows: liveRows.length,
        uniqueNins,
        duplicateSubmissions,
        duplicateNins: duplicates.length,
        succeeded: succeeded.length,
        failed: failed.length,
        failedOpen: failedOpen.length,
        recovered: recovered.length,
        created: created.length,
        updated: updatedViaRegister.length,
        internalUpdateLogs: scopedInternal.length,
        recoveryRetries: recoveryRows.length,
      },
      accepted,
      rejected,
      updates: updatesLimited,
      duplicates,
      limits: {
        maxTableRows: MAX_TABLE_ROWS,
        envelopeScanned: scopedEnvelope.length,
        internalScanned: scopedInternal.length,
      },
    };
  }
}

export default HrhisCouncilAnalyticsService;
