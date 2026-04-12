import { prisma } from "../../config/database/prisma";
import { PermissionKey, UserRole } from "@prisma/client";

// ── Default permissions per role ──────────────────────────────────────────────

export const ROLE_DEFAULTS: Record<UserRole, PermissionKey[]> = {
  OWNER: [
    "PRODUCTS_WRITE", "PRODUCTS_DELETE", "INVENTORY_WRITE",
    "SALES_VOID", "SALES_HISTORY", "TRANSFERS_APPROVE",
    "EMPLOYEES_VIEW", "EMPLOYEES_WRITE",
    "ACCOUNTING_VIEW", "ACCOUNTING_WRITE",
    "REPORTS_VIEW", "USERS_MANAGE", "SETTINGS_MANAGE", "AUDIT_VIEW",
    "CUSTOMERS_WRITE", "SUPPLIERS_WRITE", "DOCUMENTS_WRITE", "PURCHASES_MANAGE",
  ],
  MANAGER: [
    "PRODUCTS_WRITE", "PRODUCTS_DELETE", "INVENTORY_WRITE",
    "SALES_VOID", "SALES_HISTORY", "TRANSFERS_APPROVE",
    "EMPLOYEES_VIEW",
    "ACCOUNTING_VIEW",
    "REPORTS_VIEW",
    "CUSTOMERS_WRITE", "SUPPLIERS_WRITE", "DOCUMENTS_WRITE", "PURCHASES_MANAGE",
  ],
  SELLER: [
    "SALES_HISTORY",
    "CUSTOMERS_WRITE",
    "DOCUMENTS_WRITE",
  ],
};

// All permission keys for UI display
export const ALL_PERMISSIONS: PermissionKey[] = [
  "PRODUCTS_WRITE", "PRODUCTS_DELETE", "INVENTORY_WRITE",
  "SALES_VOID", "SALES_HISTORY", "TRANSFERS_APPROVE",
  "EMPLOYEES_VIEW", "EMPLOYEES_WRITE",
  "ACCOUNTING_VIEW", "ACCOUNTING_WRITE",
  "REPORTS_VIEW", "USERS_MANAGE", "SETTINGS_MANAGE", "AUDIT_VIEW",
  "CUSTOMERS_WRITE", "SUPPLIERS_WRITE", "DOCUMENTS_WRITE", "PURCHASES_MANAGE",
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  PRODUCTS_WRITE: "Crear / editar productos",
  PRODUCTS_DELETE: "Eliminar productos",
  INVENTORY_WRITE: "Ajustar cantidades de stock",
  SALES_VOID: "Anular ventas",
  SALES_HISTORY: "Ver historial de ventas (todos)",
  TRANSFERS_APPROVE: "Aprobar transferencias de stock",
  EMPLOYEES_VIEW: "Ver empleados y sueldos",
  EMPLOYEES_WRITE: "Gestionar empleados y sueldos",
  ACCOUNTING_VIEW: "Ver contabilidad",
  ACCOUNTING_WRITE: "Crear asientos contables",
  REPORTS_VIEW: "Ver reportes",
  USERS_MANAGE: "Gestionar usuarios",
  SETTINGS_MANAGE: "Configurar empresa",
  AUDIT_VIEW: "Ver log de auditoria",
  CUSTOMERS_WRITE: "Crear / editar clientes",
  SUPPLIERS_WRITE: "Crear / editar proveedores",
  DOCUMENTS_WRITE: "Crear / editar documentos",
  PURCHASES_MANAGE: "Gestionar ordenes de compra",
};

export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  { label: "Productos", keys: ["PRODUCTS_WRITE", "PRODUCTS_DELETE"] },
  { label: "Inventario", keys: ["INVENTORY_WRITE", "TRANSFERS_APPROVE"] },
  { label: "Ventas", keys: ["SALES_HISTORY", "SALES_VOID"] },
  { label: "Clientes / Documentos", keys: ["CUSTOMERS_WRITE", "DOCUMENTS_WRITE"] },
  { label: "Proveedores / Compras", keys: ["SUPPLIERS_WRITE", "PURCHASES_MANAGE"] },
  { label: "Empleados", keys: ["EMPLOYEES_VIEW", "EMPLOYEES_WRITE"] },
  { label: "Contabilidad", keys: ["ACCOUNTING_VIEW", "ACCOUNTING_WRITE"] },
  { label: "Reportes / Auditoria", keys: ["REPORTS_VIEW", "AUDIT_VIEW"] },
  { label: "Administracion", keys: ["USERS_MANAGE", "SETTINGS_MANAGE"] },
];

export class PermissionService {
  /** Returns effective permission set for a user (role defaults + overrides) */
  async getEffective(userId: number, role: UserRole): Promise<Set<PermissionKey>> {
    const overrides = await prisma.userPermission.findMany({ where: { userId } });
    const base = new Set<PermissionKey>(ROLE_DEFAULTS[role]);

    for (const o of overrides) {
      if (o.granted) base.add(o.permission);
      else base.delete(o.permission);
    }

    return base;
  }

  /** Check single permission without loading all (fast path for middleware) */
  async hasPermission(userId: number, role: UserRole, key: PermissionKey): Promise<boolean> {
    // OWNER always has everything regardless of overrides
    if (role === "OWNER") return true;

    const override = await prisma.userPermission.findUnique({
      where: { userId_permission: { userId, permission: key } },
    });

    if (override !== null) return override.granted;
    return ROLE_DEFAULTS[role].includes(key);
  }

  /** Get all overrides for a user */
  async getOverrides(userId: number) {
    return prisma.userPermission.findMany({ where: { userId } });
  }

  /** Bulk set permissions for a user — replaces all existing overrides */
  async setPermissions(userId: number, role: UserRole, grants: PermissionKey[]) {
    const grantSet = new Set(grants);
    const defaultSet = new Set(ROLE_DEFAULTS[role]);

    // Only store actual overrides (difference from role default)
    const overridesToSet: { permission: PermissionKey; granted: boolean }[] = [];

    for (const perm of ALL_PERMISSIONS) {
      const shouldGrant = grantSet.has(perm);
      const isDefault = defaultSet.has(perm);
      if (shouldGrant !== isDefault) {
        overridesToSet.push({ permission: perm, granted: shouldGrant });
      }
    }

    // Replace all overrides for this user
    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId } }),
      ...overridesToSet.map((o) =>
        prisma.userPermission.create({ data: { userId, permission: o.permission, granted: o.granted } })
      ),
    ]);

    return overridesToSet;
  }

  /** Return permissions as UI-friendly object: { permission, label, defaultGranted, overrideGranted } */
  async getPermissionsForUser(userId: number, role: UserRole) {
    const overrides = await prisma.userPermission.findMany({ where: { userId } });
    const overrideMap = new Map(overrides.map((o) => [o.permission, o.granted]));
    const defaults = new Set(ROLE_DEFAULTS[role]);

    return ALL_PERMISSIONS.map((perm) => {
      const hasOverride = overrideMap.has(perm);
      const overrideGranted = overrideMap.get(perm);
      const effective = hasOverride ? overrideGranted! : defaults.has(perm);
      return {
        permission: perm,
        label: PERMISSION_LABELS[perm],
        defaultGranted: defaults.has(perm),
        effective,
        isOverridden: hasOverride,
      };
    });
  }
}
