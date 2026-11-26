export const ANALYTICS_TAB_PERMISSIONS = ["analytics:tab:hrhis", "analytics:tab:ffars"];

export function analyticsTabPermission(tab) {
  return `analytics:tab:${tab}`;
}

export function hasGranularAnalyticsTabs(permissions = []) {
  return permissions.some((code) => String(code).startsWith("analytics:tab:"));
}

/**
 * A specific analytics tab. Until those codes are seeded, menu:analytics still opens both tabs.
 */
export function hasAnalyticsTabAccess(permissions = [], tab) {
  if (permissions.includes(analyticsTabPermission(tab))) return true;
  if (!hasGranularAnalyticsTabs(permissions) && permissions.includes("menu:analytics")) return true;
  return false;
}
