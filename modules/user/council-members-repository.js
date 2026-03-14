import mysqlClient from "../../utils/mysql-client.js";

/**
 * Council members from OpenMRS MySQL: location hierarchy (council → ward → village → hamlet)
 * + team_member_location → team_member → person_name, users (for user_uuid).
 * Used to scope activation stats and resend batches to a council.
 */

const BASE_SQL = `
SELECT
  council.name AS council_name,
  ward.name AS ward_name,
  village.name AS village_name,
  hamlet.name AS hamlet_name,
  MAX(pn.given_name) AS given_name,
  MAX(pn.family_name) AS family_name,
  tm.team_member_id,
  tm.identifier AS username,
  MAX(u.uuid) AS user_uuid
FROM location council
INNER JOIN location ward ON ward.parent_location = council.location_id AND (ward.retired = 0 OR ward.retired IS NULL)
INNER JOIN location village ON village.parent_location = ward.location_id AND (village.retired = 0 OR village.retired IS NULL)
INNER JOIN location hamlet ON hamlet.parent_location = village.location_id AND (hamlet.retired = 0 OR hamlet.retired IS NULL)
INNER JOIN team_member_location tml ON tml.location_id = hamlet.location_id
INNER JOIN team_member tm ON tml.team_member_id = tm.team_member_id AND (tm.voided = 0 OR tm.voided IS NULL)
INNER JOIN person_name pn ON tm.person_id = pn.person_id AND (pn.voided = 0 OR pn.voided IS NULL)
LEFT JOIN users u ON u.person_id = tm.person_id AND (u.retired = 0 OR u.retired IS NULL)
WHERE council.name = ?
GROUP BY council.name, ward.name, village.name, hamlet.name, tm.team_member_id, tm.identifier
`;

/**
 * Get all user UUIDs for team members in the given council (MySQL).
 * Used to filter Postgres account_activations by council.
 * @param {string} councilName - Council location name
 * @returns {Promise<string[]>} - Array of user UUIDs (may include nulls for members without user)
 */
export async function getCouncilUserUuids(councilName) {
  if (!councilName || typeof councilName !== "string" || !councilName.trim()) {
    return [];
  }
  const rows = await mysqlClient.query(
    `SELECT DISTINCT u.uuid AS user_uuid FROM location council
     INNER JOIN location ward ON ward.parent_location = council.location_id AND (ward.retired = 0 OR ward.retired IS NULL)
     INNER JOIN location village ON village.parent_location = ward.location_id AND (village.retired = 0 OR village.retired IS NULL)
     INNER JOIN location hamlet ON hamlet.parent_location = village.location_id AND (hamlet.retired = 0 OR hamlet.retired IS NULL)
     INNER JOIN team_member_location tml ON tml.location_id = hamlet.location_id
     INNER JOIN team_member tm ON tml.team_member_id = tm.team_member_id AND (tm.voided = 0 OR tm.voided IS NULL)
     LEFT JOIN users u ON u.person_id = tm.person_id AND (u.retired = 0 OR u.retired IS NULL)
     WHERE council.name = ?`,
    [councilName.trim()]
  );
  const uuids = (rows || []).map((r) => r?.user_uuid).filter(Boolean);
  return [...new Set(uuids)];
}

/**
 * Get paginated list of council members (MySQL) for "View all members" dialog.
 * @param {string} councilName - Council location name
 * @param {number} page - 1-based page
 * @param {number} limit - Page size
 * @returns {Promise<{ members: Array<{ council_name, ward_name, village_name, hamlet_name, given_name, family_name, team_member_id, username, user_uuid }>, total: number }>}
 */
export async function getCouncilMembersPaginated(councilName, page = 1, limit = 20) {
  if (!councilName || typeof councilName !== "string" || !councilName.trim()) {
    return { members: [], total: 0 };
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const countSql = `
    SELECT COUNT(DISTINCT tm.team_member_id) AS total
    FROM location council
    INNER JOIN location ward ON ward.parent_location = council.location_id AND (ward.retired = 0 OR ward.retired IS NULL)
    INNER JOIN location village ON village.parent_location = ward.location_id AND (village.retired = 0 OR village.retired IS NULL)
    INNER JOIN location hamlet ON hamlet.parent_location = village.location_id AND (hamlet.retired = 0 OR hamlet.retired IS NULL)
    INNER JOIN team_member_location tml ON tml.location_id = hamlet.location_id
    INNER JOIN team_member tm ON tml.team_member_id = tm.team_member_id AND (tm.voided = 0 OR tm.voided IS NULL)
    WHERE council.name = ?
  `;
  const [countRow] = await mysqlClient.query(countSql, [councilName.trim()]);
  const total = Number(countRow?.total ?? 0) || 0;

  const dataSql = `${BASE_SQL}
ORDER BY ward.name, village.name, hamlet.name, pn.family_name, pn.given_name
LIMIT ? OFFSET ?`;
  const rows = await mysqlClient.query(dataSql, [councilName.trim(), safeLimit, offset]);

  const members = (rows || []).map((r) => ({
    council_name: r?.council_name ?? "",
    ward_name: r?.ward_name ?? "",
    village_name: r?.village_name ?? "",
    hamlet_name: r?.hamlet_name ?? "",
    given_name: r?.given_name ?? "",
    family_name: r?.family_name ?? "",
    team_member_id: r?.team_member_id,
    username: r?.username ?? "",
    user_uuid: r?.user_uuid ?? null,
  }));

  return { members, total };
}
