import mysqlClient from "../../utils/mysql-client.js";

/**
 * Council members from OpenMRS MySQL.
 *
 * CHWs may be pinned at Ward, Village/Mtaa/Street, or Hamlet under a council
 * (ICCHW_LOWEST_OPERATIONAL_HIERARCHY is often Village). Older queries required
 * a Hamlet leaf and therefore returned no members for municipal councils like
 * Kibaha TC after HRHIS recovery — which zeroed activation stats and resends.
 *
 * Approach: walk the live location subtree under the council name, then join
 * team_member_location at any depth.
 */

const SUBTREE_CTE = `
WITH RECURSIVE subtree AS (
  SELECT
    l.location_id,
    l.name AS location_name,
    l.parent_location,
    0 AS depth
  FROM location l
  WHERE TRIM(l.name) = TRIM(?)
    AND COALESCE(l.retired, 0) = 0
  UNION ALL
  SELECT
    child.location_id,
    child.name,
    child.parent_location,
    parent.depth + 1
  FROM location child
  INNER JOIN subtree parent ON child.parent_location = parent.location_id
  WHERE COALESCE(child.retired, 0) = 0
    AND parent.depth < 12
)
`;

/**
 * Get all user UUIDs for team members anywhere under the given council (MySQL).
 * Used to filter Postgres account_activations by council.
 * @param {string} councilName - Council location name
 * @returns {Promise<string[]>}
 */
export async function getCouncilUserUuids(councilName) {
  if (!councilName || typeof councilName !== "string" || !councilName.trim()) {
    return [];
  }

  const rows = await mysqlClient.query(
    `${SUBTREE_CTE}
     SELECT DISTINCT u.uuid AS user_uuid
     FROM subtree s
     INNER JOIN team_member_location tml ON tml.location_id = s.location_id
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
     INNER JOIN users u
       ON u.person_id = tm.person_id AND COALESCE(u.retired, 0) = 0
     WHERE u.uuid IS NOT NULL`,
    [councilName.trim()]
  );

  const uuids = (rows || []).map((r) => r?.user_uuid).filter(Boolean);
  return [...new Set(uuids)];
}

/**
 * Get paginated list of council members (MySQL) for "View all members" dialog.
 * `village_name` holds the pin location name (ward / village / mtaa / hamlet).
 */
export async function getCouncilMembersPaginated(councilName, page = 1, limit = 20) {
  if (!councilName || typeof councilName !== "string" || !councilName.trim()) {
    return { members: [], total: 0 };
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const name = councilName.trim();

  const countRows = await mysqlClient.query(
    `${SUBTREE_CTE}
     SELECT COUNT(DISTINCT tm.team_member_id) AS total
     FROM subtree s
     INNER JOIN team_member_location tml ON tml.location_id = s.location_id
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
    `,
    [name]
  );
  const total = Number(countRows?.[0]?.total ?? 0) || 0;

  const rows = await mysqlClient.query(
    `${SUBTREE_CTE}
     SELECT
       ? AS council_name,
       COALESCE(parent.name, '') AS ward_name,
       s.location_name AS village_name,
       '' AS hamlet_name,
       MAX(pn.given_name) AS given_name,
       MAX(pn.family_name) AS family_name,
       tm.team_member_id,
       tm.identifier AS username,
       MAX(u.uuid) AS user_uuid
     FROM subtree s
     INNER JOIN team_member_location tml ON tml.location_id = s.location_id
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
     INNER JOIN person_name pn
       ON tm.person_id = pn.person_id AND COALESCE(pn.voided, 0) = 0
     LEFT JOIN users u
       ON u.person_id = tm.person_id AND COALESCE(u.retired, 0) = 0
     LEFT JOIN location parent ON parent.location_id = s.parent_location
     GROUP BY
       s.location_id, s.location_name, parent.name,
       tm.team_member_id, tm.identifier
     ORDER BY ward_name, village_name, family_name, given_name
     LIMIT ? OFFSET ?`,
    [name, name, safeLimit, offset]
  );

  const members = (rows || []).map((r) => ({
    council_name: r?.council_name ?? name,
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
