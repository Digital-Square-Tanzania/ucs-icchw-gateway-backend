import prisma from "../../config/prisma.js";
import { randomUUID } from "crypto";
import { defaultPermissionsForRole } from "../../utils/settings-tab-permissions.js";

class RbacService {
  static async getPermissionCodesForRoleId(roleId) {
    const rows = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    if (rows.length) return rows.map((r) => r.permission.code);
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    return defaultPermissionsForRole(role?.name);
  }

  static async getPermissionCodesForUserId(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, isDeleted: true },
    });
    if (!user || user.isDeleted) return [];
    return RbacService.getPermissionCodesForRoleId(user.roleId);
  }

  static async getMenusForRoleId(roleId) {
    const rows = await prisma.roleMenu.findMany({
      where: { roleId },
      include: { menu: true },
    });
    return rows
      .map((r) => r.menu)
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        id: m.id,
        label: m.label,
        path: m.path,
        icon: m.icon,
        order: m.order,
      }));
  }

  static async listRoles() {
    return prisma.role.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: { select: { rolePermissions: true, roleMenus: true, users: true } },
      },
    });
  }

  static async listPermissions() {
    return prisma.permission.findMany({ orderBy: { code: "asc" } });
  }

  static async listMenus() {
    return prisma.menu.findMany({ orderBy: { order: "asc" } });
  }

  static async createPermission({ code, name, description }) {
    return prisma.permission.create({
      data: {
        id: randomUUID(),
        code: code.trim(),
        name: name || code,
        description: description || null,
      },
    });
  }

  static async createMenu({ label, path, icon, order }) {
    return prisma.menu.create({
      data: {
        id: randomUUID(),
        label,
        path,
        icon: icon || null,
        order: order ?? 0,
      },
    });
  }

  static async getRoleWithRbac(roleId) {
    return prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: { include: { permission: true } },
        roleMenus: { include: { menu: true } },
      },
    });
  }

  static async replaceRolePermissions(roleId, permissionIds) {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map((permissionId) =>
        prisma.rolePermission.create({ data: { roleId, permissionId } }),
      ),
    ]);
    return prisma.permission.findMany({ where: { id: { in: permissionIds } }, orderBy: { code: "asc" } });
  }

  static async replaceRoleMenus(roleId, menuIds) {
    await prisma.$transaction([
      prisma.roleMenu.deleteMany({ where: { roleId } }),
      ...menuIds.map((menuId) => prisma.roleMenu.create({ data: { roleId, menuId } })),
    ]);
    return prisma.menu.findMany({ where: { id: { in: menuIds } }, orderBy: { order: "asc" } });
  }
}

export default RbacService;
