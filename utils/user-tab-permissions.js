/** View and create permissions for the Users page tabs. */
export const USER_SYSTEMS = ["openmrs", "dhis2", "manager"];

export const USER_TAB_PERMISSIONS = USER_SYSTEMS.flatMap((system) => [
  `users:tab:${system}:view`,
  `users:tab:${system}:create`,
]);

export function userTabPermission(system, action) {
  return `users:tab:${system}:${action}`;
}

export function hasGranularUserTabs(permissions = []) {
  return permissions.some((code) => code.startsWith("users:tab:"));
}

/**
 * Create and update include view.
 * Until the new codes are seeded, `menu:users` still allows viewing every tab.
 * Manager update is `users:tab:manager:update` and is not implied by create.
 */
export function hasUserTabAccess(permissions = [], system, action) {
  if (permissions.includes(userTabPermission(system, action))) return true;
  if (
    action === "view" &&
    (permissions.includes(userTabPermission(system, "create")) ||
      permissions.includes(userTabPermission(system, "update")))
  ) {
    return true;
  }
  if (action === "view" && !hasGranularUserTabs(permissions) && permissions.includes("menu:users")) {
    return true;
  }
  return false;
}
