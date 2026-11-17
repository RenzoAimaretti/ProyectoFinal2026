import type { DosageBasis } from "@/api/client";

/**
 * Client mirror of the server calculation
 * (`backend/src/entities/recipe/domain/spray-calculation.ts`). It is kept as a
 * line-by-line copy of that pure function so the editor's live panel and the
 * server always agree:
 *
 * - `caldoTotal = sprayVolume * lotArea`
 * - `POR_HECTAREA`: row total = `dose * lotArea`
 * - `CONCENTRACION`: row total = `dose * caldoTotal / 100`
 *   (the dose is the amount per 100 L of water, so a 1% v/v mix is entered
 *   as `1`)
 *
 * Row totals use the EXACT unrounded caldo, then every result is rounded to two
 * decimals with the same rounding the server uses (`Math.round(v * 100) / 100`).
 * When the surface or the spray volume is missing or non-positive, the panel
 * returns `null` instead of a made-up number.
 */

/** Same rounding the server applies to every total. */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** True only for a finite number strictly greater than zero. */
export function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Parses a numeric text field into a positive finite number, or null. */
export function parsePositiveNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return isPositiveFinite(value) ? value : null;
}

export type CalcItemInput = {
  dose: number | null;
  dosageBasis: DosageBasis;
};

/**
 * The three faces of one row's amount, mirroring the server's
 * `PrescriptionItemTotals` (decision 14): the absolute amount for the lot and
 * its two equivalent rates. All three are rounded to two decimals.
 */
export type LiveRowTotals = {
  /** Amount for the whole lot, in the row's base unit (e.g. L). */
  total: number;
  /** The same amount expressed per hectare. */
  perHectare: number;
  /** The same amount expressed per 100 L of caldo. */
  per100L: number;
};

export type LiveTotals = {
  /** Total spray volume in litres, or null when it cannot be computed. */
  caldoTotal: number | null;
  /** One row of totals per item (in the given order), or null per row. */
  rows: (LiveRowTotals | null)[];
};

/**
 * Live totals for the editor. `sprayVolume` and `lotArea` may be unknown; each
 * item dose may be empty. Every value that cannot be computed is returned as
 * `null` so the caller can render an honest "—" instead of a fabricated figure.
 *
 * This is a line-by-line mirror of the server's `calculatePrescriptionTotals`
 * (`backend/src/entities/recipe/domain/spray-calculation.ts`): the row amount is
 * computed from the EXACT unrounded caldo, then each of the three numbers is
 * rounded independently to two decimals. `perHectare = total / lotArea` and
 * `per100L = total * 100 / caldo`, exactly as the server derives them.
 */
export function computeLiveTotals(
  sprayVolume: number | null,
  lotArea: number | null,
  items: readonly CalcItemInput[],
): LiveTotals {
  const caldoExact =
    isPositiveFinite(sprayVolume) && isPositiveFinite(lotArea)
      ? sprayVolume * lotArea
      : null;

  const rows = items.map((item): LiveRowTotals | null => {
    if (caldoExact === null || !isPositiveFinite(lotArea)) return null;
    if (!isPositiveFinite(item.dose)) return null;
    const totalExact =
      item.dosageBasis === "POR_HECTAREA"
        ? item.dose * lotArea
        : (item.dose * caldoExact) / 100;
    return {
      total: roundTo2(totalExact),
      perHectare: roundTo2(totalExact / lotArea),
      per100L: roundTo2((totalExact * 100) / caldoExact),
    };
  });

  return {
    caldoTotal: caldoExact === null ? null : roundTo2(caldoExact),
    rows,
  };
}

/* ------------------------------------------------------------------ */
/* Dosage unit normalisation (mirrors the server, decision 13)         */
/* ------------------------------------------------------------------ */

/**
 * The same rate suffix the server strips before deriving the unit (any casing,
 * optional spaces around the slash). Keeping it identical keeps the client's
 * derivation idempotent and tolerant of the raw units the old form stored.
 */
const RATE_SUFFIX_PATTERN = /\s*\/\s*(?:ha|100\s*l)\s*$/i;

/**
 * Strips any rate suffix from a stored unit and returns the bare base unit
 * (e.g. `L/ha` or `L/100 L` -> `L`). Returns `null` for a missing or blank
 * unit, so the caller never invents a unit that was not provided.
 */
export function baseDosageUnit(unit: string | null | undefined): string | null {
  if (unit === null || unit === undefined) return null;
  const base = unit.trim().replace(RATE_SUFFIX_PATTERN, "").trim();
  return base.length === 0 ? null : base;
}

/**
 * Client mirror of the server's `normalizeDosageUnit`
 * (`backend/src/entities/recipe/domain/dosage-unit.ts`, decision 13): derives
 * the rate unit a row will be saved with from its base unit and basis.
 * `POR_HECTAREA` -> `<base>/ha`, `CONCENTRACION` -> `<base>/100 L`. Tolerant and
 * idempotent: any pre-existing rate suffix is stripped first, and a missing or
 * blank unit stays `null`.
 */
export function normalizeDosageUnit(
  unit: string | null | undefined,
  dosageBasis: DosageBasis,
): string | null {
  const base = baseDosageUnit(unit);
  if (base === null) return null;
  return dosageBasis === "POR_HECTAREA" ? `${base}/ha` : `${base}/100 L`;
}

/* ------------------------------------------------------------------ */
/* Date-only helpers (a date field round-trips through a timestamp)     */
/* ------------------------------------------------------------------ */

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Local `YYYY-MM-DD` for "today", matching a native date input value. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Local `YYYY-MM-DD` of an ISO timestamp. The date fields are read back in the
 * local calendar so a prescription written on a day shows that same day.
 */
export function isoToDateKey(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Converts a date input value into a local ISO timestamp. A date-only value is
 * anchored at local midnight so it round-trips to the same calendar day.
 */
export function dateKeyToIso(dateKey: string): string | null {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** `dd/mm/aaaa` for an ISO timestamp, or an empty string when unusable. */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateFmt.format(d);
}

const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `dd/mm/aaaa hh:mm` for an ISO timestamp, or an empty string when unusable. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateTimeFmt.format(d);
}

/** Shows a number with up to two decimals using the es-AR decimal comma. */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number together with its unit. An uncomputable value stays an
 * honest "—" without trailing the unit, so no invented figure is ever shown.
 */
export function formatWithUnit(
  value: number | null | undefined,
  unit: string | null | undefined,
): string {
  const formatted = formatNumber(value);
  if (formatted === "—") return formatted;
  return unit ? `${formatted} ${unit}` : formatted;
}
