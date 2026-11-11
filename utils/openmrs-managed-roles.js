function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * iCCHW is registered from HRHIS. Peer Educators are registered in the peers app.
 * Both may be listed here, but not created from the Users screen.
 */
export function isExternallyManagedOpenMrsRole(role) {
  const keys = [normalizeRoleKey(role?.name), normalizeRoleKey(role?.identifier)];
  return keys.some(
    (key) => key === "icchw" || key === "waja" || key === "peer educator" || key === "pe"
  );
}
