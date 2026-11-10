/** Maps menu:* permission codes to nav paths (must match `menus` seed paths). */
export const MENU_PATH_BY_PERMISSION_CODE = {
  "menu:dashboard": "/dashboard",
  "menu:users": "/users",
  "menu:analytics": "/analytics",
  "menu:settings": "/settings",
};

export function menuPathsFromPermissionCodes(codes = []) {
  return [...new Set(codes.map((c) => MENU_PATH_BY_PERMISSION_CODE[c]).filter(Boolean))];
}
