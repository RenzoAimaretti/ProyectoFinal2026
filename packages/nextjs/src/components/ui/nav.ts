import type { ComponentType } from "react";
import {
  ClipboardIcon,
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
  | "inbox"
  | "clipboard";

const NAV_ICONS: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  field: FieldIcon,
  production: ProductionIcon,
  inputs: InputsIcon,
  finance: FinanceIcon,
  livestock: LivestockIcon,
  people: PeopleIcon,
  machine: MachineIcon,
  inbox: InboxIcon,
  clipboard: ClipboardIcon,
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

/** Route of the agronomist prescription inbox; single source for nav + badge. */
export const PRESCRIPTION_MODULE_HREF = "/dashboard/recetas";

/**
 * Window event dispatched after the prescription inbox changes (a task got its
 * prescription). The dashboard layout listens for it to refresh the sidebar
 * counter without a full page reload. No payload: listeners re-read the inbox.
 */
export const PRESCRIPTION_INBOX_CHANGED_EVENT = "agro:prescription-inbox-changed";

/** Notifies the shell that the pending-prescription inbox may have changed. */
export function notifyPrescriptionInboxChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRESCRIPTION_INBOX_CHANGED_EVENT));
}

/** The modules of the back-office, shared by every dashboard page. */
export const navItems: NavItem[] = [
  {
    label: "Bandeja de Aprobación",
    href: "/dashboard/bandeja-aprobacion",
    icon: "inbox",
    group: "decisiones",
  },
  {
    label: "Recetas",
    href: PRESCRIPTION_MODULE_HREF,
    icon: "clipboard",
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
  INGENIERO: "Ingeniero agrónomo",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "Usuario";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Local product rule for module visibility. The backend exposes roles but no
 * per-module permission matrix, so this map is the single source of truth used
 * by the sidebar. `"all"` grants every module. A role that is not listed here
 * (an unknown or future backend role) receives NO modules: the map is
 * fail-closed so an unrecognised role can never gain access by accident.
 */
const MODULES_BY_ROLE: Record<string, string[] | "all"> = {
  ADMIN: "all",
  SUPERVISOR: "all",
  OPERARIO: ["Mi Campo", "Producción", "Insumos", "Maquinaria"],
  // A PRODUCTOR is a client: only their own field and their own inputs.
  PRODUCTOR: ["Mi Campo", "Insumos"],
  CONTRATISTA: ["Producción", "Maquinaria"],
  VETERINARIO: ["Mi Campo", "Ganadería"],
  // An INGENIERO is the agronomist: the prescription inbox plus read-only
  // access to tasks (Producción) and inputs (Insumos). No admin modules.
  INGENIERO: ["Recetas", "Producción", "Insumos"],
};

export function modulesForRole(
  items: NavItem[],
  role?: string | null,
): NavItem[] {
  const allowed = role ? MODULES_BY_ROLE[role] : undefined;
  // Fail closed: an unknown role (or no role yet) gets an empty list, never the
  // whole console. ADMIN/SUPERVISOR map to "all" explicitly and keep every
  // module.
  if (!allowed) return [];
  if (allowed === "all") return items;
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

/**
 * ADMIN and SUPERVISOR resolve daily reports in the approval inbox. INGENIERO
 * is deliberately NOT an approver: the agronomist writes prescriptions, they do
 * not approve parts or validate receptions.
 */
export function isApproverRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

/** INGENIERO, ADMIN and SUPERVISOR may read the pending-prescription inbox. */
export function isPrescriptionRole(role?: string | null): boolean {
  return role === "INGENIERO" || role === "ADMIN" || role === "SUPERVISOR";
}

/**
 * PRODUCTOR is the client-facing role. The backend now links a productor user
 * to a client, so a PRODUCTOR reads `/clients/me` for their own scope.
 * INGENIERO is staff, not a client, so it is deliberately excluded.
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
  if (role === "PRODUCTOR") return "/dashboard/mi-campo";
  if (role === "INGENIERO") return "/dashboard/recetas";
  return "/dashboard";
}
