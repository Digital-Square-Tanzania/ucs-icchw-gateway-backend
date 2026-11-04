import { Prisma } from "@prisma/client";

/** @returns {{ dayCount: number | null, scopeDays: number }} */
export function parseHrhisAnalyticsLookback(days) {
  const parsed = Number.parseInt(String(days), 10);
  if (!Number.isNaN(parsed) && parsed === 0) {
    return { dayCount: null, scopeDays: 0 };
  }
  const dayCount = Math.min(365, Math.max(1, parsed || 90));
  return { dayCount, scopeDays: dayCount };
}

/** Leading fragment for api_logs WHERE (includes trailing AND when bounded). */
export function hrhisApiLogCreatedAtFilter(dayCount) {
  if (dayCount == null) {
    return Prisma.empty;
  }
  return Prisma.sql`"createdAt" >= CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day') AND `;
}
