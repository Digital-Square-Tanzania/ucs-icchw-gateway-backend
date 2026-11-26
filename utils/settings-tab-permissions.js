import { USER_TAB_PERMISSIONS } from "./user-tab-permissions.js";
import { DASHBOARD_SYNC_PERMISSIONS } from "./dashboard-sync-permissions.js";
import { ANALYTICS_TAB_PERMISSIONS } from "./analytics-tab-permissions.js";

/** Granular Settings page tab permissions. Each tab code is required on its own. */
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
  return permissions.includes(settingsTabPermission(tab));
}

/**
 * @param {string[]} permissions
 */
export function hasAnySettingsTabAccess(permissions) {
  return SETTINGS_TAB_PERMISSIONS.some(
    (code) => code.startsWith("settings:tab:") && permissions.includes(code),
  );
}

/**
 * @param {string[]} permissions
 * @returns {SettingsTabId[]}
 */
/** Council coordinators can look at OpenMRS and DHIS2 users. They cannot create them, and they have no manager-user access. */
export const COUNCIL_COORDINATOR_PERMISSIONS = [
  "settings:tab:activations",
  "settings:tab:location-recovery",
  "activations:resend",
  "menu:analytics",
  "menu:settings",
  ...ANALYTICS_TAB_PERMISSIONS,
  "users:tab:openmrs:view",
  "users:tab:dhis2:view",
];

/** Removed from council coordinators when the permission seeder runs. */
export const COUNCIL_COORDINATOR_REVOKED_PERMISSIONS = [
  "users:tab:openmrs:create",
  "users:tab:dhis2:create",
  "users:tab:manager:view",
  "users:tab:manager:create",
  "users:tab:manager:update",
];

/** Defaults when role_permissions have not been seeded yet. */
export function defaultPermissionsForRole(roleName) {
  switch (roleName) {
    case "UCS_DEVELOPER":
      return [...SETTINGS_TAB_PERMISSIONS, ...USER_TAB_PERMISSIONS, ...DASHBOARD_SYNC_PERMISSIONS, ...ANALYTICS_TAB_PERMISSIONS];
    case "MOH_ADMIN":
      return [...SETTINGS_TAB_PERMISSIONS, ...USER_TAB_PERMISSIONS, ...ANALYTICS_TAB_PERMISSIONS, "dashboard:sync:dhis2"];
    case "MOH_USER":
      return [
        "menu:dashboard",
        "menu:users",
        "menu:analytics",
        ...ANALYTICS_TAB_PERMISSIONS,
        "users:tab:openmrs:view",
        "users:tab:dhis2:view",
        "users:tab:manager:view",
      ];
    case "COUNCIL_COORDINATOR":
      return [...COUNCIL_COORDINATOR_PERMISSIONS];
    default:
      return [];
  }
}

export function visibleSettingsTabs(permissions) {
  return SETTINGS_TAB_PERMISSIONS.filter((code) => code.startsWith("settings:tab:") && permissions.includes(code))
    .map((code) => TAB_ID_BY_PERMISSION[code])
    .filter(Boolean);
}
