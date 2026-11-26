import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";
import { iterBucketKeys } from "../../utils/ffars-analytics-range.js";

function councilFacilitySql(councilPrefixes) {
  if (councilPrefixes === null) return Prisma.sql`TRUE`;
  if (!Array.isArray(councilPrefixes) || councilPrefixes.length === 0) return Prisma.sql`FALSE`;
  const conditions = councilPrefixes.map(
    (prefix) => Prisma.sql`(loc.location_code = ${prefix} OR loc.location_code ILIKE ${`${prefix}.%`})`,
  );
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM openmrs_location loc
    WHERE loc.retired = false
      AND TRIM(loc.hfr_code) = TRIM(partner_api_calls.facility_code)
      AND (${Prisma.join(conditions, " OR ")})
  )`;
}

class FfarsAnalyticsRepository {
  /**
   * Eligibility traffic from partner_api_calls.
   * councilPrefixes null means every council. An empty list matches nothing.
   */
  static async getTimeseries(range, councilPrefixes = null) {
    const { from, to, bucket, label, preset } = range;
    const [summaryRows, bucketRows, recentRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int AS incoming,
          COUNT(*) FILTER (WHERE outcome = 'succeeded')::int AS succeeded,
          COUNT(*) FILTER (WHERE outcome = 'failed')::int AS failed,
          COUNT(DISTINCT NULLIF(facility_code, ''))::int AS facilities,
          COALESCE(SUM(eligible_count), 0)::int AS eligible,
          COALESCE(SUM(ineligible_count), 0)::int AS ineligible,
          COALESCE(SUM(unknown_count), 0)::int AS unclassified,
          COALESCE(SUM(chw_count) FILTER (WHERE outcome = 'succeeded'), 0)::int AS chw_count
        FROM partner_api_calls
        WHERE source = 'FFARS'
          AND operation = 'eligibility'
          AND received_at >= (${from}::timestamptz AT TIME ZONE 'UTC')
          AND received_at < (${to}::timestamptz AT TIME ZONE 'UTC')
          AND ${councilFacilitySql(councilPrefixes)}
      `,
      prisma.$queryRaw`
        SELECT
          to_char(
            date_trunc(${bucket}, (received_at AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam'),
            'YYYY-MM-DD'
          ) AS day,
          COUNT(*)::int AS incoming,
          COUNT(*) FILTER (WHERE outcome = 'succeeded')::int AS succeeded,
          COUNT(*) FILTER (WHERE outcome = 'failed')::int AS failed
        FROM partner_api_calls
        WHERE source = 'FFARS'
          AND operation = 'eligibility'
          AND received_at >= (${from}::timestamptz AT TIME ZONE 'UTC')
          AND received_at < (${to}::timestamptz AT TIME ZONE 'UTC')
          AND ${councilFacilitySql(councilPrefixes)}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw`
        SELECT
          id,
          received_at,
          facility_code,
          facility_name,
          period_month,
          period_year,
          chw_count,
          eligible_count,
          ineligible_count,
          unknown_count,
          http_status,
          outcome,
          error_message
        FROM partner_api_calls
        WHERE source = 'FFARS'
          AND operation = 'eligibility'
          AND received_at >= (${from}::timestamptz AT TIME ZONE 'UTC')
          AND received_at < (${to}::timestamptz AT TIME ZONE 'UTC')
          AND ${councilFacilitySql(councilPrefixes)}
        ORDER BY received_at DESC
        LIMIT 50
      `,
    ]);

    const summary = Array.isArray(summaryRows) ? summaryRows[0] || {} : {};
    const byDay = new Map(
      (Array.isArray(bucketRows) ? bucketRows : []).map((row) => [
        String(row.day).slice(0, 10),
        {
          incoming: Number(row.incoming) || 0,
          succeeded: Number(row.succeeded) || 0,
          failed: Number(row.failed) || 0,
        },
      ]),
    );

    const buckets = iterBucketKeys(from, to, bucket).map((day) => {
      const hit = byDay.get(day);
      return {
        day,
        incoming: hit?.incoming || 0,
        succeeded: hit?.succeeded || 0,
        failed: hit?.failed || 0,
        recovered: 0,
      };
    });

    return {
      preset,
      bucket,
      label,
      from: from.toISOString(),
      to: to.toISOString(),
      buckets,
      totals: {
        incoming: Number(summary.incoming) || 0,
        succeeded: Number(summary.succeeded) || 0,
        failed: Number(summary.failed) || 0,
        facilities: Number(summary.facilities) || 0,
        eligible: Number(summary.eligible) || 0,
        ineligible: Number(summary.ineligible) || 0,
        unclassified: Number(summary.unclassified) || 0,
        chwCount: Number(summary.chw_count) || 0,
      },
      recent: (Array.isArray(recentRows) ? recentRows : []).map((row) => ({
        id: Number(row.id),
        createdAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
        facilityCode: row.facility_code || "",
        facilityName: row.facility_name || "",
        month: row.period_month ? String(row.period_month) : "",
        year: row.period_year ? String(row.period_year) : "",
        chwCount: Number(row.chw_count) || 0,
        eligibleCount: Number(row.eligible_count) || 0,
        ineligibleCount: Number(row.ineligible_count) || 0,
        unknownCount: Number(row.unknown_count) || 0,
        httpStatus: Number(row.http_status) || 0,
        outcome: row.outcome === "failed" ? "failed" : "succeeded",
        errorMessage: row.error_message || "",
      })),
    };
  }
}

export default FfarsAnalyticsRepository;
