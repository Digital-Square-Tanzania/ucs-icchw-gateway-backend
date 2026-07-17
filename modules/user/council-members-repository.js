import mysqlClient from "../../utils/mysql-client.js";

/**
 * Council members from OpenMRS MySQL.
 *
 * CHWs may be pinned at Ward, Village/Mtaa/Street, or Hamlet under a council
 * (ICCHW_LOWEST_OPERATIONAL_HIERARCHY is often Village). Older queries required
 * a Hamlet leaf and therefore returned no members for municipal councils like
 * Kibaha TC after HRHIS recovery — which zeroed activation stats and resends.
 *
 * OpenMRS often runs MySQL 5.7, which does not support WITH RECURSIVE CTEs.
 * We walk the subtree iteratively with simple parent_location queries instead.
 */

const MAX_SUBTREE_DEPTH = 8;

/**
 * Collect all location_ids under councils matching the given name (any depth).
 * @param {string} councilName
 * @returns {Promise<Array<{ location_id: number, location_name: string, parent_location: number|null }>>}
 */
async function collectCouncilSubtree(councilName) {
  const name = councilName.trim();
  const roots = await mysqlClient.query(
    `SELECT location_id, name AS location_name, parent_location
     FROM location
     WHERE TRIM(name) = ?
       AND COALESCE(retired, 0) = 0`,
    [name]
  );

  if (!roots?.length) return [];

  const byId = new Map();
  let frontier = [];

  for (const row of roots) {
    const id = Number(row.location_id);
    if (!Number.isFinite(id) || byId.has(id)) continue;
    const node = {
      location_id: id,
      location_name: row.location_name,
      parent_location: row.parent_location != null ? Number(row.parent_location) : null,
    };
    byId.set(id, node);
    frontier.push(id);
  }

  for (let depth = 0; depth < MAX_SUBTREE_DEPTH && frontier.length > 0; depth++) {
    const placeholders = frontier.map(() => "?").join(",");
    const children = await mysqlClient.query(
      `SELECT location_id, name AS location_name, parent_location
       FROM location
       WHERE parent_location IN (${placeholders})
         AND COALESCE(retired, 0) = 0`,
      frontier
    );

    const nextFrontier = [];
    for (const row of children || []) {
      const id = Number(row.location_id);
      if (!Number.isFinite(id) || byId.has(id)) continue;
      byId.set(id, {
        location_id: id,
        location_name: row.location_name,
        parent_location: row.parent_location != null ? Number(row.parent_location) : null,
      });
      nextFrontier.push(id);
    }
    frontier = nextFrontier;
  }

  return [...byId.values()];
}

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

  const subtree = await collectCouncilSubtree(councilName);
  if (subtree.length === 0) return [];

  const locationIds = subtree.map((n) => n.location_id);
  const placeholders = locationIds.map(() => "?").join(",");

  const rows = await mysqlClient.query(
    `SELECT DISTINCT u.uuid AS user_uuid
     FROM team_member_location tml
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
     INNER JOIN users u
       ON u.person_id = tm.person_id AND COALESCE(u.retired, 0) = 0
     WHERE tml.location_id IN (${placeholders})
       AND u.uuid IS NOT NULL`,
    locationIds
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

  const subtree = await collectCouncilSubtree(name);
  if (subtree.length === 0) return { members: [], total: 0 };

  const locationIds = subtree.map((n) => n.location_id);
  const placeholders = locationIds.map(() => "?").join(",");
  const nameById = new Map(subtree.map((n) => [n.location_id, n]));

  const countRows = await mysqlClient.query(
    `SELECT COUNT(DISTINCT tm.team_member_id) AS total
     FROM team_member_location tml
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
     WHERE tml.location_id IN (${placeholders})`,
    locationIds
  );
  const total = Number(countRows?.[0]?.total ?? 0) || 0;

  const rows = await mysqlClient.query(
    `SELECT
       tml.location_id AS pin_location_id,
       MAX(pn.given_name) AS given_name,
       MAX(pn.family_name) AS family_name,
       tm.team_member_id,
       tm.identifier AS username,
       MAX(u.uuid) AS user_uuid
     FROM team_member_location tml
     INNER JOIN team_member tm
       ON tml.team_member_id = tm.team_member_id AND COALESCE(tm.voided, 0) = 0
     INNER JOIN person_name pn
       ON tm.person_id = pn.person_id AND COALESCE(pn.voided, 0) = 0
     LEFT JOIN users u
       ON u.person_id = tm.person_id AND COALESCE(u.retired, 0) = 0
     WHERE tml.location_id IN (${placeholders})
     GROUP BY tml.location_id, tm.team_member_id, tm.identifier
     ORDER BY family_name, given_name
     LIMIT ? OFFSET ?`,
    [...locationIds, safeLimit, offset]
  );

  const members = (rows || []).map((r) => {
    const pin = nameById.get(Number(r.pin_location_id));
    const parentId = pin?.parent_location ?? null;
    const parent = parentId != null ? nameById.get(parentId) : null;
    return {
      council_name: name,
      ward_name: parent?.location_name ?? "",
      village_name: pin?.location_name ?? "",
      hamlet_name: "",
      given_name: r?.given_name ?? "",
      family_name: r?.family_name ?? "",
      team_member_id: r?.team_member_id,
      username: r?.username ?? "",
      user_uuid: r?.user_uuid ?? null,
    };
  });

  return { members, total };
}
