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
 * A single sidebar module entry. Kept as plain, serializable data so any page
 * can hand it to the client `DashboardLayout`.
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: NavIconKey;
}

/** The modules of the back-office, shared by every dashboard page. */
export const navItems: NavItem[] = [
  { label: "Mi Campo", href: "/dashboard/mi-campo", icon: "field" },
  { label: "Producción", href: "/dashboard/produccion", icon: "production" },
  { label: "Insumos", href: "/dashboard/insumos", icon: "inputs" },
  { label: "Finanzas", href: "/dashboard/finanzas", icon: "finance" },
  { label: "Ganadería", href: "/dashboard/ganadero", icon: "livestock" },
  { label: "Personal", href: "/dashboard/personal", icon: "people" },
  { label: "Maquinaria", href: "/dashboard/maquinaria", icon: "machine" },
  {
    label: "Bandeja de Aprobación",
    href: "/dashboard/bandeja-aprobacion",
    icon: "inbox",
  },
  { label: "Clientes", href: "/dashboard/clientes", icon: "people" },
  { label: "Categorías", href: "/dashboard/categorias", icon: "inputs" },
  { label: "Labores", href: "/dashboard/labores", icon: "production" },
];

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
