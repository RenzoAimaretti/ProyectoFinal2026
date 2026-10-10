import type { ComponentType } from "react";
import {
  FinanceIcon,
  FieldIcon,
  InboxIcon,
  InputsIcon,
  LivestockIcon,
  MachineIcon,
  PeopleIcon,
  ProductionIcon,
} from "./icons";

/**
 * Serializable icon key. Pages pass `navItems` (plain data) from server
 * components into the client layout, so the icon must be a string that the
 * client resolves locally instead of a function that cannot cross the
 * server/client boundary.
 */
export type NavIconKey =
  | "field"
  | "production"
  | "inputs"
  | "finance"
  | "livestock"
  | "people"
  | "machine"
  | "inbox";

const NAV_ICONS: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  field: FieldIcon,
  production: ProductionIcon,
  inputs: InputsIcon,
  finance: FinanceIcon,
  livestock: LivestockIcon,
  people: PeopleIcon,
  machine: MachineIcon,
  inbox: InboxIcon,
};

export function navIcon(
  key?: NavIconKey,
): ComponentType<{ className?: string }> | undefined {
  return key ? NAV_ICONS[key] : undefined;
}

/**
 * Sidebar category. The nine back-office modules are regrouped into a small
 * number of legend-rail categories; the value stays serializable so pages can
 * keep passing `navItems` across the server/client boundary untouched.
 */
export type NavGroupKey = "decisiones" | "campo" | "operacion" | "administracion";

/**
 * A single sidebar module entry. Kept as plain, serializable data so any page
 * can hand it to the client `DashboardLayout`.
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: NavIconKey;
  /** Legend-rail category. Omitted entries fall into `administracion`. */
  group?: NavGroupKey;
}

/** The modules of the back-office, shared by every dashboard page. */
export const navItems: NavItem[] = [
  {
    label: "Bandeja de Aprobación",
    href: "/dashboard/bandeja-aprobacion",
    icon: "inbox",
    group: "decisiones",
  },
  { label: "Mi Campo", href: "/dashboard/mi-campo", icon: "field", group: "campo" },
  { label: "Producción", href: "/dashboard/produccion", icon: "production", group: "operacion" },
  { label: "Insumos", href: "/dashboard/insumos", icon: "inputs", group: "operacion" },
  { label: "Maquinaria", href: "/dashboard/maquinaria", icon: "machine", group: "operacion" },
  { label: "Ganadería", href: "/dashboard/ganadero", icon: "livestock", group: "operacion" },
  { label: "Finanzas", href: "/dashboard/finanzas", icon: "finance", group: "administracion" },
  { label: "Personal", href: "/dashboard/personal", icon: "people", group: "administracion" },
  { label: "Clientes", href: "/dashboard/clientes", icon: "people", group: "administracion" },
];

/** Render order and legend labels for the nav categories. */
export const NAV_GROUP_ORDER: NavGroupKey[] = [
  "decisiones",
  "campo",
  "operacion",
  "administracion",
];

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  decisiones: "Decisiones",
  campo: "Campo",
  operacion: "Operación",
  administracion: "Administración",
};

export type NavGroup = { key: NavGroupKey; label: string; items: NavItem[] };

/**
 * Groups the (already role-filtered) items by category, preserving the fixed
 * category order and dropping empty groups.
 */
export function groupNavItems(items: NavItem[]): NavGroup[] {
  const buckets = new Map<NavGroupKey, NavItem[]>();
  for (const item of items) {
    const key: NavGroupKey = item.group ?? "administracion";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return NAV_GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: NAV_GROUP_LABELS[key],
    items: buckets.get(key) ?? [],
  }));
}

/* ------------------------------------------------------------------ */
/* Role model                                                          */
/* ------------------------------------------------------------------ */

/** Human-readable labels for the backend roles (see AUTH_USER_ROLES). */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  OPERARIO: "Operario",
  PRODUCTOR: "Productor",
  CONTRATISTA: "Contratista",
  VETERINARIO: "Veterinario",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "Usuario";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Local product rule for module visibility. The backend exposes roles but no
 * per-module permission matrix, so this map is the single source of truth used
 * by the sidebar. `"all"` grants every module; an unknown role is not locked
 * out of the app, so it also receives every module.
 */
const MODULES_BY_ROLE: Record<string, string[] | "all"> = {
  ADMIN: "all",
  SUPERVISOR: "all",
  OPERARIO: ["Mi Campo", "Producción", "Insumos", "Maquinaria"],
  // A PRODUCTOR is a client: only their own field and their own inputs.
  PRODUCTOR: ["Mi Campo", "Insumos"],
  CONTRATISTA: ["Producción", "Maquinaria"],
  VETERINARIO: ["Mi Campo", "Ganadería"],
};

export function modulesForRole(
  items: NavItem[],
  role?: string | null,
): NavItem[] {
  const allowed = role ? MODULES_BY_ROLE[role] : undefined;
  if (!allowed || allowed === "all") return items;
  return items.filter((item) => allowed.includes(item.label));
}

/**
 * Display label for a module, which can vary by role. The field-mapping module
 * reads "Mi Campo" to the client (PRODUCTOR — it is their own field) and
 * "Campos de clientes" to staff (who manage many clients' fields).
 */
export function navLabel(item: NavItem, role?: string | null): string {
  if (item.href === "/dashboard/mi-campo") {
    return isClientRole(role) ? "Mi Campo" : "Campos de clientes";
  }
  return item.label;
}

/** ADMIN owns the tenant-wide administration views (validation, stock). */
export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN";
}

/** ADMIN and SUPERVISOR resolve daily reports in the approval inbox. */
export function isApproverRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

/**
 * PRODUCTOR is the client-facing role. The backend now links a productor user
 * to a client, so a PRODUCTOR reads `/clients/me` for their own scope.
 */
export function isClientRole(role?: string | null): boolean {
  return role === "PRODUCTOR";
}

/** ADMIN and SUPERVISOR manage the tenant client portfolio (`GET /clients`). */
export function isClientManagerRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

/** Landing route for an authenticated role. */
export function homePathForRole(role?: string | null): string {
  return role === "PRODUCTOR" ? "/dashboard/mi-campo" : "/dashboard";
}
