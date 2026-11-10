import { randomUUID } from "crypto";
import prisma from "../../config/prisma.js";
import { RoleType } from "@prisma/client";
import { SETTINGS_TAB_PERMISSIONS } from "../../utils/settings-tab-permissions.js";

const PERMISSION_META = {
  "settings:manage": "Full Settings access (all tabs)",
  "settings:tab:hrhis-reg": "Settings tab: HRHIS registrations",
  "settings:tab:activations": "Settings tab: CHW activations",
  "settings:tab:location-recovery": "Settings tab: HRHIS location recovery",
  "settings:tab:maintenance": "Settings tab: Maintenance & sync",
  "settings:tab:rbac": "Settings tab: Roles, permissions & menus",
  "activations:resend": "Resend individual or batch activation emails",
  "activations:schedule": "Edit activation resend scheduler",
  "menu:dashboard": "Nav: Dashboard",
  "menu:users": "Nav: Users",
  "menu:settings": "Nav: Settings",
  "menu:analytics": "Nav: Analytics",
};

const DEFAULT_MENUS = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard", order: 10 },
  { label: "Users", path: "/users", icon: "users", order: 20 },
  { label: "Settings", path: "/settings", icon: "settings", order: 30 },
  { label: "Analytics", path: "/analytics", icon: "chart", order: 40 },
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
    for (const code of SETTINGS_TAB_PERMISSIONS) {
      permissions.push(await upsertPermission(code));
    }

    for (const m of DEFAULT_MENUS) {
      const existing = await prisma.menu.findUnique({ where: { path: m.path } });
      if (!existing) {
        await prisma.menu.create({
          data: { id: randomUUID(), ...m },
        });
      }
    }

    const menus = await prisma.menu.findMany();
    const permIds = permissions.map((p) => p.id);

    const ucsDev = await prisma.role.findUnique({ where: { name: RoleType.UCS_DEVELOPER } });
    const mohAdmin = await prisma.role.findUnique({ where: { name: RoleType.MOH_ADMIN } });
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
      const manage = permissions.find((p) => p.code === "settings:manage");
      if (manage) {
        await assignAllPermissions(mohAdmin.id, [manage.id]);
      }
      for (const menu of menus) {
        await prisma.roleMenu.upsert({
          where: { roleId_menuId: { roleId: mohAdmin.id, menuId: menu.id } },
          create: { roleId: mohAdmin.id, menuId: menu.id },
          update: {},
        });
      }
    }

    if (councilCoord) {
      const codes = [
        "settings:tab:activations",
        "activations:resend",
        "menu:analytics",
        "menu:users",
        "menu:settings",
      ];
      const coordPermIds = permissions.filter((p) => codes.includes(p.code)).map((p) => p.id);
      await assignAllPermissions(councilCoord.id, coordPermIds);
      const coordMenus = menus.filter((m) => ["/analytics", "/users", "/settings"].includes(m.path));
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
