import prisma from "../../config/prisma.js";
import { iterBucketKeys } from "../../utils/ffars-analytics-range.js";

class FfarsAnalyticsRepository {
  /**
   * Eligibility traffic from partner_api_calls. One indexed range, no api_logs JSON scan.
   */
  static async getTimeseries(range) {
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
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.partnerApiCall.findMany({
        where: {
          source: "FFARS",
          operation: "eligibility",
          receivedAt: { gte: from, lt: to },
        },
        orderBy: { receivedAt: "desc" },
        take: 50,
      }),
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
      recent: recentRows.map((row) => ({
        id: row.id,
        createdAt: row.receivedAt.toISOString(),
        facilityCode: row.facilityCode || "",
        facilityName: row.facilityName || "",
        month: row.periodMonth ? String(row.periodMonth) : "",
        year: row.periodYear ? String(row.periodYear) : "",
        chwCount: row.chwCount,
        eligibleCount: row.eligibleCount,
        ineligibleCount: row.ineligibleCount,
        unknownCount: row.unknownCount,
        httpStatus: row.httpStatus,
        outcome: row.outcome === "failed" ? "failed" : "succeeded",
        errorMessage: row.errorMessage || "",
      })),
    };
  }
}

export default FfarsAnalyticsRepository;
