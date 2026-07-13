import prisma from "../../config/prisma.js";
import mysqlClient from "../../utils/mysql-client.js";

class DashboardRepository {
  constructor() {}

  /**
   * Get the count of OpenMRS Users
   */
  static async getOpenMRSUsersCount() {
    const [result] = await mysqlClient.query("SELECT COUNT(*) FROM users WHERE retired = 0");
    return Number(result["COUNT(*)"]);
  }

  /**
   * Get the count of DHIS2 Users
   */
  static async getDHIS2UsersCount() {
    const query = await prisma.dHIS2User.count();
    return Number(query);
  }

  /**
   * Get the count of UCS Teams
   */
  static async getUCSTeamsCount() {
    const query = await prisma.openMRSTeam.count();
    return Number(query);
  }

  /**
   * Get the count of Team Members (Total + Breakdown)
   */
  static async getTeamMembersStats() {
    const total = await prisma.openMRSTeamMember.count();

    // const chwCount = await prisma.openMRSTeamMember.count({ where: { role: "CHW" } });
    // const providerCount = await prisma.openMRSTeamMember.count({ where: { role: "PROVIDER" } });
    // const coordinatorCount = await prisma.openMRSTeamMember.count({ where: { role: "COORDINATOR" } });

    return;
    Number(total);
    // chw: chwCount,
    // provider: providerCount,
    // coordinator: coordinatorCount,
  }

  /**
   * Get the count of all Villages
   */
  static async getVillagesCount() {
    const query = await prisma.openMRSLocation.count({
      where: { type: "Village" },
    });
    return Number(query);
  }

  /**
   * Get the count of Registered Facilities
   */
  static async getFacilitiesCount() {
    const query = await prisma.openMRSLocation.count({
      where: { type: "Facility" },
    });
    return Number(query);
  }

  /**
   * Get user registrations for the last 12 months
   * including months with 0 registrations
   */
  static async getUserRegistrationsPerMonth() {
    return await prisma.$queryRaw`
      WITH months AS (
        SELECT to_char(generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()), '1 month'), 'YYYY-MM') AS month
      )
      SELECT
        m.month,
        COUNT(o."created_at") AS registrations
      FROM months m
      LEFT JOIN openmrs_team_members o ON to_char(o."created_at", 'YYYY-MM') = m.month
      GROUP BY m.month
      ORDER BY m.month ASC;
    `;
  }

  /**
   * Get the last 7 OpenMRS users
   */
  static async getLast7OpenMRSUsers() {
    return await prisma.openMRSTeamMember.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        teamName: true,
        locationName: true,
        username: true,
      },
    });
  }

  /**
   * Get Team Members grouped by Zones (based on OpenMRS Location Type)
   */
  static async getTeamMembersByZone() {
    return await prisma.$queryRaw`
    WITH RECURSIVE location_hierarchy AS (
        -- Start at Zones
        SELECT
            l.uuid AS location_uuid,
            l.parent AS parent_uuid,
            l.type AS location_type,
            l.name AS zone_name,
            l.uuid AS zone_uuid
        FROM openmrs_location l
        WHERE l.type = 'Zone'

        UNION ALL

        SELECT
            child.uuid AS location_uuid,
            child.parent AS parent_uuid,
            child.type AS location_type,
            parent.zone_name,
            parent.zone_uuid
        FROM openmrs_location child
        JOIN location_hierarchy parent ON child.parent = parent.location_uuid
    )

    -- Group members by Zone
    SELECT
        z.zone_name,
        COUNT(t.id) AS members_count
    FROM openmrs_team_members t
    JOIN location_hierarchy z ON t."location_uuid" = z.location_uuid
    WHERE z.location_type = 'Facility'
    GROUP BY z.zone_name
    ORDER BY members_count DESC;
  `;
  }

  /**
   * Get Teams grouped by Zones
   */
  static async getTeamsByZone() {
    return await prisma.$queryRaw`
      WITH RECURSIVE location_hierarchy AS (
          -- Base case: Zone-level locations
          SELECT
              l.uuid AS location_uuid,
              l.parent AS parent_uuid,
              l.type AS location_type,
              l.name AS location_name,
              l.uuid AS zone_uuid
          FROM openmrs_location l
          WHERE l.type = 'Zone'
  
          UNION ALL
  
          -- Recursive case: Join child locations to their parent Zones
          SELECT
              child.uuid AS location_uuid,
              child.parent AS parent_uuid,
              child.type AS location_type,
              child.name AS location_name,
              parent.zone_uuid
          FROM openmrs_location child
          JOIN location_hierarchy parent ON child.parent = parent.location_uuid
      )
  
      -- Get unique team counts per Zone
      SELECT
          z.location_name AS zone_name,
          COUNT(DISTINCT t."team_uuid") AS teams_count
      FROM openmrs_team_members t
      JOIN location_hierarchy loc ON t."location_uuid" = loc.location_uuid
      JOIN location_hierarchy z ON loc.zone_uuid = z.location_uuid
      GROUP BY z.zone_uuid, z.location_name
      ORDER BY z.location_name;
    `;
  }

  static async getTeamSizeDistribution() {
    return await prisma.$queryRaw`
    SELECT 
        COUNT(*) AS team_count,
        CASE 
            WHEN member_count < 2 THEN 'Single Member Teams'
            WHEN member_count BETWEEN 2 AND 3 THEN '2 to 3 Member Teams'
            ELSE '4+ Member Teams'
        END AS team_size_category
    FROM (
        SELECT t."uuid", COUNT(m.id) AS member_count
        FROM openmrs_team_members m
        JOIN openmrs_teams t ON m."team_uuid" = t.uuid
        GROUP BY t."uuid"
    ) AS team_member_counts
    GROUP BY team_size_category
    ORDER BY team_size_category;
  `;
  }

  /**
   * Daily HRHIS register traffic for Settings charts — entirely from api_logs.
   * Uses GatewayResponder rows for /chw/register (response.body.message.body envelope)
   * so each HTTP attempt is counted once:
   * - incoming: all such rows
   * - succeeded: envelope status = success (HTTP 2xx create or update-as-register)
   * - failed: envelope status = fail or HTTP >= 400
   */
  static async getHrhisRegisterTimeseries(days = 30) {
    const dayCount = Math.min(90, Math.max(7, Number.parseInt(String(days), 10) || 30));

    const rows = await prisma.$queryRaw`
      WITH days AS (
        SELECT generate_series(
          (CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day'))::date,
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      register_logs AS (
        SELECT
          ("createdAt")::date AS day,
          LOWER(COALESCE(response->'body'->'message'->'body'->>'status', '')) AS outcome,
          COALESCE(NULLIF(response->>'status', '')::int, 0) AS http_status
        FROM api_logs
        WHERE "createdAt" >= CURRENT_DATE - ((${dayCount}::int - 1) * INTERVAL '1 day')
          AND COALESCE(request->>'url', '') ILIKE '%/chw/register%'
          AND response->'body'->'message'->'body' IS NOT NULL
      ),
      daily AS (
        SELECT
          day,
          COUNT(*)::int AS incoming,
          COUNT(*) FILTER (
            WHERE outcome = 'fail' OR http_status >= 400
          )::int AS failed,
          COUNT(*) FILTER (
            WHERE outcome = 'success'
               OR (outcome NOT IN ('success', 'fail') AND http_status >= 200 AND http_status < 400)
          )::int AS succeeded
        FROM register_logs
        GROUP BY day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS day,
        COALESCE(r.incoming, 0)::int AS incoming,
        COALESCE(r.succeeded, 0)::int AS succeeded,
        COALESCE(r.failed, 0)::int AS failed
      FROM days d
      LEFT JOIN daily r ON r.day = d.day
      ORDER BY d.day ASC
    `;

    const buckets = (Array.isArray(rows) ? rows : []).map((row) => ({
      day: String(row.day),
      incoming: Number(row.incoming) || 0,
      succeeded: Number(row.succeeded) || 0,
      failed: Number(row.failed) || 0,
    }));

    const totals = buckets.reduce(
      (acc, b) => {
        acc.incoming += b.incoming;
        acc.succeeded += b.succeeded;
        acc.failed += b.failed;
        return acc;
      },
      { incoming: 0, succeeded: 0, failed: 0 }
    );

    return { days: dayCount, buckets, totals };
  }
}

export default DashboardRepository;
