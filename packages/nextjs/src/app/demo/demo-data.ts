// Synthetic scenario + local store types for the public, read-only /demo walkthrough.
//
// EVERYTHING here is invented for illustration. No real operation, customer,
// price, benchmark or metric is represented. This module is pure data and pure
// helpers: it performs no network calls and mutates nothing.

/**
 * WhatsApp CTA values are re-exported from the shared contact module so the
 * demo and the landing point at the same number.
 */
export { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/lib/contact";

/** es-AR number formatting shared by every demo view. */
export const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formats an ISO date (YYYY-MM-DD) as es-AR dd/mm/yyyy without timezone drift. */
export function fmtDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return dateFmt.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** Parses a user-typed decimal that may use a comma (es-AR). */
export function parseDecimal(value: string): number {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* The three stops of the guided journey                               */
/* ------------------------------------------------------------------ */

export type DemoViewId = "operario" | "admin" | "cliente";

export type DemoView = {
  id: DemoViewId;
  /** Tab label. */
  label: string;
  /** One-line guidance shown while the guided journey is on. */
  hint: string;
};

export const DEMO_VIEWS: DemoView[] = [
  {
    id: "operario",
    label: "Operario",
    hint: "Cargá el parte diario en el teléfono. Sin señal no bloquea: queda guardado en el equipo.",
  },
  {
    id: "admin",
    label: "Admin",
    hint: "El parte llegó a la oficina. Aprobalo para que quede trazado al lote.",
  },
  {
    id: "cliente",
    label: "Cliente",
    hint: "El productor audita el parte aprobado: lote, labor, insumos y certificado.",
  },
];

/* ------------------------------------------------------------------ */
/* The shared demo store                                               */
/* ------------------------------------------------------------------ */

export type ParteStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO";

/** Maps a store status to the `.op-swatch` / `.op-parcel` data-status value. */
export const PARTE_DATA_STATUS: Record<ParteStatus, "pendiente" | "aprobado" | "rechazado"> = {
  PENDIENTE: "pendiente",
  APROBADO: "aprobado",
  RECHAZADO: "rechazado",
};

export type Insumo = {
  id: string;
  nombre: string;
  partida: string;
  cantidad: number;
  unidad: string;
};

export type Parte = {
  id: string;
  cliente: string;
  campo: string;
  lote: string;
  labor: string;
  /** ISO date (YYYY-MM-DD). */
  fecha: string;
  hectareas: number;
  horas: number;
  operario: string;
  insumos: Insumo[];
  fotoNombre: string | null;
  status: ParteStatus;
};

/** Units accepted by the operator's input rows. */
export const DEMO_UNITS = ["L", "kg", "mL", "g", "u"] as const;

function insumo(id: string, nombre: string, partida: string, cantidad: number, unidad: string): Insumo {
  return { id, nombre, partida, cantidad, unidad };
}

/**
 * Synthetic store seed. Starts with a mix of states so the admin queue and the
 * client audit view both have content before the visitor does anything.
 */
export const DEMO_SEED_PARTES: Parte[] = [
  {
    id: "PD-0001",
    cliente: "Productor Demo",
    campo: "Establecimiento La Esperanza",
    lote: "Lote 4 · Norte",
    labor: "Pulverización",
    fecha: "2025-10-06",
    hectareas: 48.5,
    horas: 6.5,
    operario: "Operario Demo",
    insumos: [
      insumo("ins-1a", "Glifosato 66,2%", "L-2291", 121.25, "L"),
      insumo("ins-1b", "Coadyuvante siliconado", "L-2310", 12.5, "L"),
    ],
    fotoNombre: "cuaderno-parte-0001.jpg",
    status: "PENDIENTE",
  },
  {
    id: "PD-0002",
    cliente: "Productor Demo",
    campo: "Establecimiento La Esperanza",
    lote: "Lote 7 · Sur",
    labor: "Siembra de gruesa",
    fecha: "2025-10-05",
    hectareas: 62,
    horas: 9,
    operario: "Cuadrilla Demo 1",
    insumos: [insumo("ins-2a", "Semilla de soja DM 46R18", "SEM-1180", 3720, "kg")],
    fotoNombre: "cuaderno-parte-0002.jpg",
    status: "PENDIENTE",
  },
  {
    id: "PD-0003",
    cliente: "Productor Demo",
    campo: "Establecimiento Santa Rosa",
    lote: "Lote 2 · Este",
    labor: "Fertilización",
    fecha: "2025-10-04",
    hectareas: 30.2,
    horas: 4.5,
    operario: "Operario Demo",
    insumos: [insumo("ins-3a", "Urea granulada 46%", "FER-0442", 1500, "kg")],
    fotoNombre: "cuaderno-parte-0003.jpg",
    status: "APROBADO",
  },
  {
    id: "PD-0004",
    cliente: "Productor Demo",
    campo: "Establecimiento El Chañar",
    lote: "Lote 1 · Oeste",
    labor: "Herbicida residual",
    fecha: "2025-10-03",
    hectareas: 41.8,
    horas: 5.5,
    operario: "Cuadrilla Demo 2",
    insumos: [insumo("ins-4a", "Flumioxazin 48%", "L-2275", 33.4, "L")],
    fotoNombre: null,
    status: "RECHAZADO",
  },
];

/* ------------------------------------------------------------------ */
/* Operator draft (the editable phone form)                            */
/* ------------------------------------------------------------------ */

export type InsumoDraft = {
  id: string;
  nombre: string;
  partida: string;
  cantidad: string;
  unidad: string;
};

export type ParteDraft = {
  cliente: string;
  campo: string;
  lote: string;
  labor: string;
  fecha: string;
  hectareas: string;
  horas: string;
  operario: string;
  insumos: InsumoDraft[];
  fotoNombre: string | null;
};

/** Prefill for the operator form, taken from the synthetic seed scenario. */
export function makeInitialDraft(): ParteDraft {
  return {
    cliente: "Productor Demo",
    campo: "Establecimiento La Esperanza",
    lote: "Lote 4 · Norte",
    labor: "Pulverización",
    fecha: "2025-10-06",
    hectareas: "48,5",
    horas: "6,5",
    operario: "Operario Demo",
    insumos: [
      { id: "draft-ins-1", nombre: "Glifosato 66,2%", partida: "L-2291", cantidad: "121,25", unidad: "L" },
      { id: "draft-ins-2", nombre: "Coadyuvante siliconado", partida: "L-2310", cantidad: "12,5", unidad: "L" },
    ],
    fotoNombre: "cuaderno-parte-0001.jpg",
  };
}

/** Builds the next synthetic parte id from the numbers already in the store. */
export function makeParteId(partes: Parte[]): string {
  let max = 0;
  for (const p of partes) {
    const match = /^PD-(\d+)$/.exec(p.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PD-${String(max + 1).padStart(4, "0")}`;
}

/** Deterministic synthetic certificate code derived from the parte id. */
export function certCodeFor(parteId: string): string {
  const digits = parteId.replace(/\D/g, "").padStart(4, "0");
  return `CERT-2026-${digits}`;
}

/* ------------------------------------------------------------------ */
/* Derived projections of the store                                    */
/* ------------------------------------------------------------------ */

export type LoteGroup = {
  id: string;
  campo: string;
  lote: string;
  cliente: string;
  partes: Parte[];
  /** Dominant status: pending wins, then approved, then rejected. */
  status: ParteStatus;
  /** Most recent approved parte for the lot, or null. */
  approved: Parte | null;
};

/** Groups the store by lot, keeping the pieces the admin plan and client audit need. */
export function groupByLote(partes: Parte[]): LoteGroup[] {
  const map = new Map<string, LoteGroup>();
  for (const p of partes) {
    const id = `${p.campo}||${p.lote}`;
    let group = map.get(id);
    if (!group) {
      group = {
        id,
        campo: p.campo,
        lote: p.lote,
        cliente: p.cliente,
        partes: [],
        status: "RECHAZADO",
        approved: null,
      };
      map.set(id, group);
    }
    group.partes.push(p);
  }

  for (const group of map.values()) {
    const hasPending = group.partes.some((p) => p.status === "PENDIENTE");
    const approved = group.partes
      .filter((p) => p.status === "APROBADO")
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const hasRejected = group.partes.some((p) => p.status === "RECHAZADO");
    group.status = hasPending ? "PENDIENTE" : approved.length > 0 ? "APROBADO" : hasRejected ? "RECHAZADO" : "RECHAZADO";
    group.approved = approved[0] ?? null;
    group.partes.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  return [...map.values()].sort(
    (a, b) => a.campo.localeCompare(b.campo) || a.lote.localeCompare(b.lote),
  );
}

/* ------------------------------------------------------------------ */
/* Synthetic admin panels                                              */
/* ------------------------------------------------------------------ */

/** Synthetic monthly activity for the admin trend chart. */
export const DEMO_ADMIN_TREND = {
  labels: ["May", "Jun", "Jul", "Ago", "Sep", "Oct"],
  series: [
    {
      key: "partes",
      label: "Partes de trabajo",
      color: "var(--op-signal)",
      values: [4, 7, 6, 9, 11, 8],
    },
    {
      key: "recepciones",
      label: "Recepciones de insumos",
      color: "var(--op-ink)",
      values: [2, 3, 4, 5, 6, 5],
    },
  ],
};
