import { USER_TAB_PERMISSIONS } from "./user-tab-permissions.js";

/** Granular Settings page tab permissions. `settings:manage` grants all tabs. */
export const SETTINGS_TAB_PERMISSIONS = [
  "settings:manage",
  "settings:tab:activations",
  "settings:tab:location-recovery",
  "settings:tab:maintenance",
  "settings:tab:rbac",
  "settings:tab:email-control",
  "activations:resend",
  "activations:schedule",
  "menu:dashboard",
  "menu:users",
  "menu:settings",
  "menu:analytics",
];

/** @typedef {'activations' | 'location-recovery' | 'maintenance' | 'rbac' | 'email-control'} SettingsTabId */

/** @type {Record<string, SettingsTabId>} */
const TAB_ID_BY_PERMISSION = {
  "settings:tab:activations": "activations",
  "settings:tab:location-recovery": "location-recovery",
  "settings:tab:maintenance": "maintenance",
  "settings:tab:rbac": "rbac",
  "settings:tab:email-control": "email-control",
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
  if (tab === "email-control") {
    return permissions.includes("settings:tab:email-control");
  }
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
      return [...SETTINGS_TAB_PERMISSIONS, ...USER_TAB_PERMISSIONS];
    case "MOH_USER":
      return [
        "menu:dashboard",
        "menu:users",
        "menu:analytics",
        "users:tab:openmrs:view",
        "users:tab:dhis2:view",
        "users:tab:manager:view",
      ];
    case "COUNCIL_COORDINATOR":
      return [
        "settings:tab:activations",
        "settings:tab:location-recovery",
        "activations:resend",
        "menu:analytics",
        "menu:settings",
        "users:tab:openmrs:view",
        "users:tab:openmrs:create",
        "users:tab:manager:view",
        "users:tab:manager:create",
      ];
    default:
      return [];
  }
}

export function visibleSettingsTabs(permissions) {
  const tabs = permissions.includes("settings:manage")
    ? Object.values(TAB_ID_BY_PERMISSION)
    : SETTINGS_TAB_PERMISSIONS.filter((code) => code.startsWith("settings:tab:") && permissions.includes(code))
        .map((code) => TAB_ID_BY_PERMISSION[code])
        .filter(Boolean);
  if (permissions.includes("settings:tab:email-control")) return tabs;
  return tabs.filter((tab) => tab !== "email-control");
}
