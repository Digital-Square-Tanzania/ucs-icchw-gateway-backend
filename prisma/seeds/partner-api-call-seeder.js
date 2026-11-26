import prisma from "../../config/prisma.js";
import { buildPartnerApiCall } from "../../utils/partner-api-call.js";

const BATCH = 200;

async function namesFor(codes) {
  if (!codes.length) return new Map();
  const rows = await prisma.openMRSLocation.findMany({
    where: { retired: false, hfrCode: { in: codes } },
    select: { hfrCode: true, name: true, locationId: true },
    orderBy: { locationId: "asc" },
  });
  const names = new Map();
  for (const row of rows) {
    if (row.hfrCode && !names.has(row.hfrCode)) names.set(row.hfrCode, row.name);
  }
  return names;
}

export async function backfillPartnerApiCalls() {
  let cursor = 0;
  let inserted = 0;
  let scanned = 0;

  for (;;) {
    const logs = await prisma.$queryRaw`
      SELECT id, request, response, "createdAt" AS created_at
      FROM api_logs
      WHERE id > ${cursor}
        AND COALESCE(request->>'url', '') ~ '/chw/(status|register|update|station)([/?]|$)'
        AND response->'body'->'message' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM partner_api_calls p WHERE p.api_log_id = api_logs.id
        )
      ORDER BY id
      LIMIT ${BATCH}
    `;
    if (!Array.isArray(logs) || logs.length === 0) break;

    cursor = Number(logs[logs.length - 1].id);
    scanned += logs.length;

    const built = [];
    for (const log of logs) {
      const row = buildPartnerApiCall({
        id: Number(log.id),
        request: log.request,
        response: log.response,
        createdAt: log.created_at,
      });
      if (row) built.push(row);
    }

    const names = await namesFor([...new Set(built.map((row) => row.facilityCode).filter(Boolean))]);
    const data = built.map((row) => ({
      ...row,
      facilityName: row.facilityCode ? names.get(row.facilityCode) || null : null,
    }));

    if (data.length) {
      const result = await prisma.partnerApiCall.createMany({ data, skipDuplicates: true });
      inserted += result.count;
    }

    console.log(`partner api calls: scanned ${scanned}, inserted ${inserted}, cursor ${cursor}`);
    if (logs.length < BATCH) break;
  }

  console.log(`partner api calls backfill done. inserted ${inserted}.`);
  return { inserted, scanned };
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith("partner-api-call-seeder.js");
if (isDirectRun) {
  backfillPartnerApiCalls()
    .catch((error) => {
      console.error("partner api call backfill failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
