import { randomUUID } from "crypto";
import prisma from "../../config/prisma.js";
import { RoleType } from "@prisma/client";
import { SETTINGS_TAB_PERMISSIONS } from "../../utils/settings-tab-permissions.js";
import { USER_TAB_PERMISSIONS } from "../../utils/user-tab-permissions.js";

const PERMISSION_META = {
  "settings:manage": "Full Settings access (all tabs)",
  "settings:tab:hrhis-reg": "Settings tab: HRHIS registrations",
  "settings:tab:activations": "Settings tab: CHW activations",
  "settings:tab:location-recovery": "Settings tab: HRHIS location recovery",
  "settings:tab:maintenance": "Settings tab: Maintenance & sync",
  "settings:tab:rbac": "Settings tab: Roles, permissions & menus",
  "settings:tab:email-control": "Settings tab: Email control",
  "activations:resend": "Resend individual or batch activation emails",
  "activations:schedule": "Edit activation resend scheduler",
  "menu:dashboard": "Nav: Dashboard",
  "menu:users": "Nav: Users",
  "users:tab:openmrs:view": "Users tab: OpenMRS view",
  "users:tab:openmrs:create": "Users tab: OpenMRS create",
  "users:tab:dhis2:view": "Users tab: DHIS2 view",
  "users:tab:dhis2:create": "Users tab: DHIS2 create",
  "users:tab:manager:view": "Users tab: Manager view",
  "users:tab:manager:create": "Users tab: Manager create",
  "users:tab:manager:update": "Users tab: Manager update",
  "menu:settings": "Nav: Settings",
  "menu:analytics": "Nav: Analytics",
};

const DEFAULT_MENUS = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard", order: 10 },
  { label: "Users", path: "/users", icon: "users", order: 20 },
  { label: "Analytics", path: "/analytics", icon: "chart", order: 30 },
  { label: "Settings", path: "/settings", icon: "settings", order: 40 },
];

async function upsertPermission(code) {
  const existing = await prisma.permission.findUnique({ where: { code } });
  if (existing) {
    return existing;
  }
  return prisma.permission.create({
    data: {
      id: randomUUID(),
      code,
      name: PERMISSION_META[code] || code,
      description: PERMISSION_META[code] || null,
    },
  });
}

async function assignAllPermissions(roleId, permissionIds) {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }
}

class PermissionSeeder {
  static async seed() {
    console.log("🔐 Seeding permissions, menus, and role assignments…");

    const permissions = [];
    for (const code of [...SETTINGS_TAB_PERMISSIONS, ...USER_TAB_PERMISSIONS]) {
      permissions.push(await upsertPermission(code));
    }

    for (const m of DEFAULT_MENUS) {
      const existing = await prisma.menu.findUnique({ where: { path: m.path } });
      if (!existing) {
        await prisma.menu.create({
          data: { id: randomUUID(), ...m },
        });
      } else if (existing.order !== m.order || existing.label !== m.label) {
        await prisma.menu.update({
          where: { path: m.path },
          data: { order: m.order, label: m.label, icon: m.icon },
        });
      }
    }

    const menus = await prisma.menu.findMany();
    const permIds = permissions.map((p) => p.id);

    const ucsDev = await prisma.role.findUnique({ where: { name: RoleType.UCS_DEVELOPER } });
    const mohAdmin = await prisma.role.findUnique({ where: { name: RoleType.MOH_ADMIN } });
    const mohUser = await prisma.role.findUnique({ where: { name: RoleType.MOH_USER } });
    const councilCoord = await prisma.role.findUnique({ where: { name: RoleType.COUNCIL_COORDINATOR } });

    if (ucsDev) {
      await assignAllPermissions(ucsDev.id, permIds);
      for (const menu of menus) {
        await prisma.roleMenu.upsert({
          where: { roleId_menuId: { roleId: ucsDev.id, menuId: menu.id } },
          create: { roleId: ucsDev.id, menuId: menu.id },
          update: {},
        });
      }
    }

    if (mohAdmin) {
      const mohCodes = ["settings:manage", "settings:tab:email-control", ...USER_TAB_PERMISSIONS];
      const mohPermIds = permissions.filter((p) => mohCodes.includes(p.code)).map((p) => p.id);
      await assignAllPermissions(mohAdmin.id, mohPermIds);
      for (const menu of menus) {
        await prisma.roleMenu.upsert({
          where: { roleId_menuId: { roleId: mohAdmin.id, menuId: menu.id } },
          create: { roleId: mohAdmin.id, menuId: menu.id },
          update: {},
        });
      }
    }

    if (mohUser) {
      const codes = [
        "menu:dashboard",
        "menu:users",
        "menu:analytics",
        "users:tab:openmrs:view",
        "users:tab:dhis2:view",
        "users:tab:manager:view",
      ];
      const viewPermIds = permissions.filter((p) => codes.includes(p.code)).map((p) => p.id);
      await assignAllPermissions(mohUser.id, viewPermIds);
      const viewMenus = menus.filter((m) => ["/dashboard", "/users", "/analytics"].includes(m.path));
      for (const menu of viewMenus) {
        await prisma.roleMenu.upsert({
          where: { roleId_menuId: { roleId: mohUser.id, menuId: menu.id } },
          create: { roleId: mohUser.id, menuId: menu.id },
          update: {},
        });
      }
    }

    if (councilCoord) {
      const codes = [
        "settings:tab:activations",
        "settings:tab:location-recovery",
        "activations:resend",
        "menu:analytics",
        "menu:settings",
        "users:tab:openmrs:view",
        "users:tab:openmrs:create",
        "users:tab:manager:view",
        "users:tab:manager:create",
        "users:tab:manager:update",
      ];
      const coordPermIds = permissions.filter((p) => codes.includes(p.code)).map((p) => p.id);
      await assignAllPermissions(councilCoord.id, coordPermIds);
      const coordMenus = menus.filter((m) => ["/analytics", "/settings"].includes(m.path));
      for (const menu of coordMenus) {
        await prisma.roleMenu.upsert({
          where: { roleId_menuId: { roleId: councilCoord.id, menuId: menu.id } },
          create: { roleId: councilCoord.id, menuId: menu.id },
          update: {},
        });
      }
    }

    console.log("✅ Permissions and menus seeded.");
  }
}

export default PermissionSeeder;
