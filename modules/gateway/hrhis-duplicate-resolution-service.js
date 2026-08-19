import prisma from "../../config/prisma.js";
import CustomError from "../../utils/custom-error.js";
import ApiLogger from "../../utils/api-logger.js";
import GatewayService from "./gateway-service.js";
import TeamMemberRepository from "../openmrs/team-member/openmrs-team-member-repository.js";
import HrhisLocationRecoveryService from "./hrhis-location-recovery-service.js";
import openmrsApiClient from "../../utils/openmrs-api-client.js";

const RECOVERY_SOURCE = "hrhis-location-recovery";
const RESOLUTION_SOURCE = "hrhis-duplicate-resolution";
const MERGEABLE_FIELDS = ["firstName", "middleName", "lastName", "sex", "email", "phoneNumber"];
const LOG_PREFIX = "[HRHIS duplicate resolution]";

function logResolutionEvent(level, message, meta = {}) {
  const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const line = `${LOG_PREFIX} ${message}${suffix}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function extractChwFromRequest(request) {
  const body = request?.body?.message?.body;
  return Array.isArray(body) ? body[0] || {} : body || {};
}

function chwDisplayName(chw) {
  return [chw?.firstName, chw?.middleName, chw?.lastName].filter(Boolean).join(" ").trim() || null;
}

function parseResolution(response) {
  if (response == null) return null;
  let parsed = response;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.resolvedAt) return null;
  return {
    status: parsed.resolutionStatus || parsed.resolution?.action || "unknown",
    resolvedAt: parsed.resolvedAt,
    resolvedByEmail: parsed.resolution?.resolvedByEmail || null,
    action: parsed.resolution?.action || parsed.resolutionStatus || null,
    note: parsed.resolution?.note || null,
    mergedFields: parsed.resolution?.mergedFields || [],
    resolutionLogId: parsed.resolution?.resolutionLogId || null,
  };
}

function normalizeCompareValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

function buildRegisteredSnapshot(teamMember, openMrsGender = null) {
  if (!teamMember) return null;
  return {
    identifier: teamMember.identifier,
    openMrsUuid: teamMember.openMrsUuid,
    firstName: teamMember.firstName,
    middleName: teamMember.middleName,
    lastName: teamMember.lastName,
    NIN: teamMember.NIN,
    email: teamMember.email,
    phoneNumber: teamMember.phoneNumber,
    username: teamMember.username,
    sex: openMrsGender ? GatewayService.genderToSexLabel(openMrsGender) : null,
    teamName: teamMember.teamName,
    locationName: teamMember.locationName,
    locationDescription: teamMember.locationDescription,
    updatedAt: teamMember.updatedAt,
  };
}

function computeFieldDiffs(registered, incoming) {
  const rows = [
    { field: "firstName", registered: registered?.firstName, incoming: incoming?.firstName, mergeable: true },
    { field: "middleName", registered: registered?.middleName, incoming: incoming?.middleName, mergeable: true },
    { field: "lastName", registered: registered?.lastName, incoming: incoming?.lastName, mergeable: true },
    { field: "sex", registered: registered?.sex, incoming: incoming?.sex?.toUpperCase?.() || incoming?.sex, mergeable: true },
    { field: "email", registered: registered?.email, incoming: incoming?.email, mergeable: true },
    { field: "phoneNumber", registered: registered?.phoneNumber, incoming: incoming?.phoneNumber, mergeable: true },
    { field: "hfrCode", registered: null, incoming: incoming?.hfrCode, mergeable: false },
    { field: "locationCode", registered: null, incoming: incoming?.locationCode, mergeable: false },
    { field: "locationType", registered: null, incoming: incoming?.locationType, mergeable: false },
  ];

  return rows.map((row) => {
    const reg = normalizeCompareValue(row.registered);
    const inc = normalizeCompareValue(row.incoming);
    return {
      field: row.field,
      registered: row.registered ?? null,
      incoming: row.incoming ?? null,
      differs: reg !== inc && inc !== null,
      mergeable: row.mergeable,
    };
  });
}

function buildPartialChwPayload(nin, incoming, mergeFields = []) {
  const chw = { NIN: nin };
  for (const field of mergeFields) {
    if (!MERGEABLE_FIELDS.includes(field)) continue;
    if (incoming[field] !== undefined) chw[field] = incoming[field];
  }
  return chw;
}

function envelopeOutcome(row) {
  const outcome = String(row.outcome || "").toLowerCase();
  const httpStatus = Number(row.http_status) || 0;
  const isSuccess =
    outcome === "success" || (outcome !== "fail" && httpStatus >= 200 && httpStatus < 400);
  return {
    httpStatus,
    isSuccess,
    isFailure: outcome === "fail" || httpStatus >= 400,
    kind: httpStatus === 201 ? "create" : httpStatus === 200 ? "update" : isSuccess ? "success" : "failure",
    message: row.err_msg || null,
  };
}

class HrhisDuplicateResolutionService {
  static async fetchEnvelopeRowsForCouncil({ prefixes, days, nin = null }) {
    const dayCount = Math.min(365, Math.max(1, Number.parseInt(String(days), 10) || 90));
    const ninFilter = nin?.trim() || null;

    const rows = await prisma.$queryRaw`
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
        AND (
          ${ninFilter}::text IS NULL
          OR COALESCE(
            request->'body'->'message'->'body'->0->>'NIN',
            request->'body'->'message'->'body'->>'NIN'
          ) = ${ninFilter}
        )
      ORDER BY "createdAt" ASC
      LIMIT 10000
    `;

    const list = Array.isArray(rows) ? rows : [];
    return list.filter(
      (row) =>
        row.recovery_source !== RECOVERY_SOURCE &&
        HrhisLocationRecoveryService.locationCodeMatchesPrefixes(row.location_code, prefixes)
    );
  }

  static async getDuplicateDetail({ region, district, council, nin, days = 90 } = {}) {
    if (!nin?.trim()) {
      throw new CustomError("nin is required.", 400);
    }

    const prefixes = await HrhisLocationRecoveryService.resolveCouncilPrefixes(region, district, council);
    const rows = await HrhisDuplicateResolutionService.fetchEnvelopeRowsForCouncil({
      prefixes,
      days,
      nin: nin.trim(),
    });

    if (rows.length < 2) {
      throw new CustomError(`NIN ${nin.trim()} has fewer than two council-scoped submissions in this period.`, 404);
    }

    const teamMember = await TeamMemberRepository.getTeamMemberByNin(nin.trim());
    let openMrsGender = null;
    if (teamMember?.personUuid) {
      try {
        const person = await openmrsApiClient.get(`person/${teamMember.personUuid}`, {
          v: "custom:(gender)",
        });
        openMrsGender = person?.gender || null;
      } catch {
        openMrsGender = null;
      }
    }

    const existsInOpenMrs = teamMember
      ? await GatewayService.openMrsTeamMemberExists(teamMember.openMrsUuid)
      : false;
    const registered = buildRegisteredSnapshot(teamMember, openMrsGender);

    const submissions = rows.map((row, index) => {
      const chw = extractChwFromRequest(row.request);
      const outcome = envelopeOutcome(row);
      const resolution = parseResolution(row.response);
      const fieldDiffs = registered ? computeFieldDiffs(registered, chw) : computeFieldDiffs(null, chw);
      const mergeableDiffs = fieldDiffs.filter((d) => d.mergeable && d.differs);

      return {
        logId: Number(row.id),
        logUuid: row.uuid,
        submissionNumber: index + 1,
        totalSubmissions: rows.length,
        createdAt: row.createdAt,
        locationCode: row.location_code,
        hfrCode: row.hfr_code || chw.hfrCode || null,
        name: chwDisplayName(chw),
        payload: {
          firstName: chw.firstName ?? null,
          middleName: chw.middleName ?? null,
          lastName: chw.lastName ?? null,
          NIN: chw.NIN ?? nin.trim(),
          sex: chw.sex ?? null,
          email: chw.email ?? null,
          phoneNumber: chw.phoneNumber ?? null,
          hfrCode: chw.hfrCode ?? null,
          locationCode: chw.locationCode ?? null,
          locationType: chw.locationType ?? null,
        },
        header: row.request?.body?.message?.header ?? null,
        outcome: {
          httpStatus: outcome.httpStatus,
          kind: outcome.kind,
          isSuccess: outcome.isSuccess,
          isFailure: outcome.isFailure,
          message: outcome.message,
        },
        resolution,
        fieldDiffs,
        mergeableDiffs,
        isResolved: Boolean(resolution),
        isOpen: !resolution,
      };
    });

    const openCount = submissions.filter((s) => s.isOpen).length;
    const resolvedCount = submissions.length - openCount;

    return {
      scope: {
        region: region?.trim(),
        district: district?.trim(),
        council: council?.trim(),
        days: Math.min(365, Math.max(1, Number.parseInt(String(days), 10) || 90)),
        councilPrefixes: prefixes,
      },
      nin: nin.trim(),
      registeredChw: registered,
      existsInOpenMrs,
      hasRegisteredChw: Boolean(registered && existsInOpenMrs),
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        openCount,
        resolvedCount,
        mergeableSubmissionCount: submissions.filter((s) => s.isOpen && s.mergeableDiffs.length > 0).length,
      },
    };
  }

  static async resolveDuplicateSubmissions({
    region,
    district,
    council,
    nin,
    items = [],
    note,
    days = 90,
    req,
    res,
    next,
  } = {}) {
    if (!nin?.trim()) {
      throw new CustomError("nin is required.", 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new CustomError("At least one resolution item is required.", 400);
    }

    const detail = await HrhisDuplicateResolutionService.getDuplicateDetail({
      region,
      district,
      council,
      nin,
      days,
    });

    const submissionById = new Map(detail.submissions.map((s) => [s.logId, s]));
    let teamMember = await TeamMemberRepository.getTeamMemberByNin(nin.trim());
    let existsInOpenMrs = teamMember
      ? await GatewayService.openMrsTeamMemberExists(teamMember.openMrsUuid)
      : false;

    const results = [];

    logResolutionEvent("info", "Batch started", {
      nin: nin.trim(),
      council,
      itemCount: items.length,
      actions: items.map((i) => ({ logId: i.logId, action: i.action })),
    });

    for (const item of items) {
      const logId = Number(item.logId);
      const action = String(item.action || "").toLowerCase();
      const itemNote = item.note || note || null;

      if (!Number.isFinite(logId)) {
        results.push({ logId: item.logId, status: "skipped", message: "Invalid log id." });
        continue;
      }

      if (!["ignore", "merge", "delete"].includes(action)) {
        results.push({ logId, status: "skipped", message: `Unsupported action '${action}'.` });
        continue;
      }

      const submission = submissionById.get(logId);
      if (!submission) {
        results.push({ logId, status: "skipped", message: "Submission not in duplicate set for this NIN." });
        continue;
      }

      if (submission.isResolved) {
        results.push({
          logId,
          status: "skipped",
          message: `Already resolved as '${submission.resolution?.action}' on ${submission.resolution?.resolvedAt}.`,
        });
        continue;
      }

      const log = await prisma.apiLog.findUnique({ where: { id: logId } });
      if (!log) {
        results.push({ logId, status: "skipped", message: "api_log row not found." });
        continue;
      }

      let mergedFields = [];
      let mergeResult = null;

      if (action === "merge") {
        if (!teamMember || !existsInOpenMrs) {
          results.push({
            logId,
            status: "failed",
            message: "Cannot merge: no live ICCHW record for this NIN in OpenMRS.",
          });
          continue;
        }

        const requestedMergeFields = Array.isArray(item.mergeFields)
          ? item.mergeFields.filter((f) => MERGEABLE_FIELDS.includes(f))
          : submission.mergeableDiffs.map((d) => d.field);
        const mergeFields =
          requestedMergeFields.length > 0
            ? requestedMergeFields
            : submission.mergeableDiffs.map((d) => d.field);

        if (mergeFields.length === 0) {
          results.push({
            logId,
            status: "failed",
            message: "Merge requires at least one differing mergeable field.",
          });
          continue;
        }

        const incoming = submission.payload;
        const partialChw = buildPartialChwPayload(nin.trim(), incoming, mergeFields);
        logResolutionEvent("info", "Merge attempt", {
          logId,
          nin: nin.trim(),
          mergeFields,
          partialChwKeys: Object.keys(partialChw),
          openMrsUuid: teamMember?.openMrsUuid,
        });
        try {
          mergeResult = await GatewayService.applyChwDemographicUpdate(
            req,
            { headersSent: false },
            () => {},
            partialChw,
            teamMember,
            { skipSideEffects: true }
          );
          mergedFields = mergeResult.updatedFields.filter((f) => mergeFields.includes(f));
          logResolutionEvent("info", "Merge demographics applied", {
            logId,
            requestedFields: mergeFields,
            appliedFields: mergedFields,
            allUpdatedFields: mergeResult.updatedFields,
          });
          teamMember = await TeamMemberRepository.getTeamMemberByNin(nin.trim());
          existsInOpenMrs = teamMember
            ? await GatewayService.openMrsTeamMemberExists(teamMember.openMrsUuid)
            : false;
        } catch (error) {
          logResolutionEvent("error", "Merge demographic update failed", {
            logId,
            nin: nin.trim(),
            message: error?.message || String(error),
            statusCode: error?.statusCode,
            customCode: error?.customCode,
            stack: error?.stack,
          });
          results.push({
            logId,
            status: "failed",
            message: error?.message || String(error),
            errorCode: error?.customCode ?? error?.statusCode ?? null,
          });
          continue;
        }
      }

      const resolutionLog = await ApiLogger.log(req, {
        action: "DUPLICATE_RESOLUTION",
        source: RESOLUTION_SOURCE,
        nin: nin.trim(),
        targetLogId: logId,
        resolutionAction: action,
        mergedFields,
        fieldChanges: mergeResult?.fieldChanges || null,
        note: itemNote,
      });

      const annotated = await ApiLogger.annotateDuplicateResolution(logId, {
        action,
        resolvedByUserId: req?.user?.id,
        resolvedByEmail: req?.user?.email,
        note: itemNote,
        mergedFields,
        resolutionLogId: resolutionLog?.id,
        resolutionLogUuid: resolutionLog?.uuid,
      });

      if (!annotated) {
        logResolutionEvent("error", "Failed to annotate api_log with resolution audit", {
          logId,
          action,
          resolutionLogId: resolutionLog?.id ?? null,
        });
        results.push({
          logId,
          status: "failed",
          message: "Demographic update completed but failed to persist resolution audit on api_logs.",
        });
        continue;
      }

      const resolvedRow = {
        logId,
        status: "resolved",
        action,
        mergedFields,
        resolutionLogId: resolutionLog?.id ?? null,
        message:
          action === "merge"
            ? mergedFields.length > 0
              ? `Merged ${mergedFields.length} field(s) into ICCHW record.`
              : "Marked as merged (incoming values already matched ICCHW)."
            : action === "delete"
              ? "Duplicate submission dismissed (audit retained)."
              : "Duplicate submission marked as ignored.",
      };
      logResolutionEvent("info", "Submission resolved", resolvedRow);
      results.push(resolvedRow);
    }

    const resolved = results.filter((r) => r.status === "resolved").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    for (const row of results) {
      if (row.status === "failed") {
        logResolutionEvent("error", "Item failed", row);
      } else if (row.status === "skipped") {
        logResolutionEvent("warn", "Item skipped", row);
      }
    }

    logResolutionEvent(failed > 0 ? "warn" : "info", "Batch finished", { resolved, failed, skipped });

    return {
      nin: nin.trim(),
      attempted: items.length,
      resolved,
      failed,
      skipped,
      results,
    };
  }
}

export default HrhisDuplicateResolutionService;
