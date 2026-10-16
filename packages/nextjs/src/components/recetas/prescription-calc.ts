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

export type LiveTotals = {
  /** Total spray volume in litres, or null when it cannot be computed. */
  caldoTotal: number | null;
  /** One total per item (in the given order), or null per row. */
  rows: (number | null)[];
};

/**
 * Live totals for the editor. `sprayVolume` and `lotArea` may be unknown; each
 * item dose may be empty. Every value that cannot be computed is returned as
 * `null` so the caller can render an honest "—" instead of a fabricated figure.
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

  const rows = items.map((item) => {
    if (caldoExact === null || !isPositiveFinite(item.dose)) return null;
    if (!isPositiveFinite(lotArea)) return null;
    const total =
      item.dosageBasis === "POR_HECTAREA"
        ? item.dose * lotArea
        : (item.dose * caldoExact) / 100;
    return roundTo2(total);
  });

  return {
    caldoTotal: caldoExact === null ? null : roundTo2(caldoExact),
    rows,
  };
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
