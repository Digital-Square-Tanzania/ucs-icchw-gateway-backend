import prisma from "../../config/prisma.js";
import mysqlClient from "../../utils/mysql-client.js";

class DashboardRepository {
  constructor() {}

  /**
   * Get the count of OpenMRS Users
   */
  static async getOpenMRSUsersCount() {
    const query = await prisma.openMRSTeamMember.count();
    const query2 = mysqlClient.query("SELECT COUNT(*) FROM users WHERE voided = 0");
    return Number(query2);
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
}

export default DashboardRepository;
