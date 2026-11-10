/** Granular Settings page tab permissions. `settings:manage` grants all tabs. */
export const SETTINGS_TAB_PERMISSIONS = [
  "settings:manage",
  "settings:tab:hrhis-reg",
  "settings:tab:activations",
  "settings:tab:location-recovery",
  "settings:tab:maintenance",
  "settings:tab:rbac",
  "activations:resend",
  "activations:schedule",
  "menu:dashboard",
  "menu:users",
  "menu:settings",
  "menu:analytics",
];

/** @typedef {'hrhis-reg' | 'activations' | 'location-recovery' | 'maintenance' | 'rbac'} SettingsTabId */

/** @type {Record<string, SettingsTabId>} */
const TAB_ID_BY_PERMISSION = {
  "settings:tab:hrhis-reg": "hrhis-reg",
  "settings:tab:activations": "activations",
  "settings:tab:location-recovery": "location-recovery",
  "settings:tab:maintenance": "maintenance",
  "settings:tab:rbac": "rbac",
};

/**
 * @param {SettingsTabId} tab
 */
export function settingsTabPermission(tab) {
  return `settings:tab:${tab}`;
}

/**
 * @param {string[]} permissions
 * @param {SettingsTabId} tab
 */
export function hasSettingsTabAccess(permissions, tab) {
  if (permissions.includes("settings:manage")) return true;
  return permissions.includes(settingsTabPermission(tab));
}

/**
 * @param {string[]} permissions
 */
export function hasAnySettingsTabAccess(permissions) {
  if (permissions.includes("settings:manage")) return true;
  return SETTINGS_TAB_PERMISSIONS.some(
    (code) => code.startsWith("settings:tab:") && permissions.includes(code),
  );
}

/**
 * @param {string[]} permissions
 * @returns {SettingsTabId[]}
 */
/** Defaults when role_permissions have not been seeded yet. */
export function defaultPermissionsForRole(roleName) {
  switch (roleName) {
    case "UCS_DEVELOPER":
    case "MOH_ADMIN":
      return [...SETTINGS_TAB_PERMISSIONS];
    case "COUNCIL_COORDINATOR":
      return [
        "settings:tab:hrhis-reg",
        "settings:tab:activations",
        "activations:resend",
        "menu:analytics",
        "menu:users",
        "menu:settings",
      ];
    default:
      return [];
  }
}

export function visibleSettingsTabs(permissions) {
  if (permissions.includes("settings:manage")) {
    return Object.values(TAB_ID_BY_PERMISSION);
  }
  return SETTINGS_TAB_PERMISSIONS.filter((code) => code.startsWith("settings:tab:") && permissions.includes(code))
    .map((code) => TAB_ID_BY_PERMISSION[code])
    .filter(Boolean);
}
