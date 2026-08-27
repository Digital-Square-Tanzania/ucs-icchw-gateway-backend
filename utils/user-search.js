/**
 * Normalize a user-list search term. Returns null when empty.
 * @param {string|undefined|null} search
 * @returns {string|null}
 */
export function normalizeUserSearchTerm(search) {
  const term = String(search || "").trim();
  return term.length > 0 ? term : null;
}

/**
 * Prisma where-clause for username + name fields (given, family, second).
 * @param {string|null|undefined} search
 * @param {{ includeMiddleName?: boolean, includeUsername?: boolean }} options
 */
export function buildUsernameAndNameSearchWhere(search, { includeMiddleName = true, includeUsername = true } = {}) {
  const term = normalizeUserSearchTerm(search);
  if (!term) return null;

  const OR = [];
  if (includeUsername) {
    OR.push({ username: { contains: term, mode: "insensitive" } });
  }
  OR.push({ firstName: { contains: term, mode: "insensitive" } });
  OR.push({ lastName: { contains: term, mode: "insensitive" } });
  if (includeMiddleName) {
    OR.push({ middleName: { contains: term, mode: "insensitive" } });
  }

  return { OR };
}
