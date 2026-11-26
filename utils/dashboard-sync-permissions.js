/** Dashboard sync actions. Each code is required on its own. */
export const DASHBOARD_SYNC_PERMISSIONS = ["dashboard:sync:dhis2", "dashboard:sync:openmrs"];

export function dashboardSyncPermission(path) {
  if (path === "dhis2" || path === "openmrs") return "dashboard:sync:dhis2";
  if (path === "facilities" || path === "villages") return "dashboard:sync:openmrs";
  return null;
}
