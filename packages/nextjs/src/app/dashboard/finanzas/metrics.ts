/**
 * Pure helpers of the calculator table: sorting, the valuation toggle and the
 * error copy. Profitability itself is computed by the backend (one source of
 * truth for rate policy, rounding and firm isolation); the client only sorts,
 * formats and shows what it received. No runtime imports: this file is loaded
 * directly by `node --test`.
 */

export type ValuationMode = "AL_APROBAR" | "A_VALOR_HOY";

export const MODES: ValuationMode[] = ["AL_APROBAR", "A_VALOR_HOY"];

export const MODE_LABELS: Record<ValuationMode, string> = {
  AL_APROBAR: "Al aprobar",
  A_VALOR_HOY: "A valor de hoy",
};

export type SortColumn =
  | "field"
  | "client"
  | "area"
  | "income"
  | "cost"
  | "margin"
  | "marginPerHa"
  | "profitability";

export const SORT_COLUMNS: SortColumn[] = [
  "field",
  "client",
  "area",
  "income",
  "cost",
  "margin",
  "marginPerHa",
  "profitability",
];

export type SortDirection = "asc" | "desc";
export type SortState = { column: SortColumn; direction: SortDirection };

/** The fields of a table row the sorting reads (all amounts are decimal strings). */
export type SortableRow = {
  farmName: string;
  lotName: string;
  clientName: string;
  areaHa: string;
  incomeArs: string;
  costArs: string;
  marginArs: string;
  marginPerHaArs: string | null;
  profitability: string | null;
};

const NUMERIC_KEY: Record<Exclude<SortColumn, "field" | "client">, (row: SortableRow) => string | null> = {
  area: (row) => row.areaHa,
  income: (row) => row.incomeArs,
  cost: (row) => row.costArs,
  margin: (row) => row.marginArs,
  marginPerHa: (row) => row.marginPerHaArs,
  profitability: (row) => row.profitability,
};

const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d+))?$/;

/** An exact comparable value of a decimal string; `null` when missing or malformed. */
function toScaled(value: string | null): { units: bigint; scale: number } | null {
  if (typeof value !== "string") return null;
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, sign, integer, fraction = ""] = match;
  const units = BigInt(integer + fraction);
  return { units: sign ? -units : units, scale: fraction.length };
}

function compareDecimal(a: { units: bigint; scale: number }, b: { units: bigint; scale: number }): number {
  const scale = Math.max(a.scale, b.scale);
  const left = a.units * BigInt(10) ** BigInt(scale - a.scale);
  const right = b.units * BigInt(10) ** BigInt(scale - b.scale);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

/**
 * Sorts by any column without mutating the input. Stable (equal keys keep their
 * original order, also when descending) and a missing value (a "—" in the
 * table) always goes last, whatever the direction.
 */
export function sortRows<T extends SortableRow>(rows: readonly T[], sort: SortState): T[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    let result: number;

    if (sort.column === "field") {
      result = compareText(a.row.farmName, b.row.farmName) || compareText(a.row.lotName, b.row.lotName);
      result *= factor;
    } else if (sort.column === "client") {
      result = compareText(a.row.clientName, b.row.clientName) * factor;
    } else {
      const left = toScaled(NUMERIC_KEY[sort.column](a.row));
      const right = toScaled(NUMERIC_KEY[sort.column](b.row));
      if (left === null && right === null) result = 0;
      else if (left === null) return 1;
      else if (right === null) return -1;
      else result = compareDecimal(left, right) * factor;
    }

    return result || a.index - b.index;
  });

  return indexed.map((item) => item.row);
}

/** Clicking a column sorts it ascending; clicking it again flips the direction. */
export function nextSort(current: SortState | null, column: SortColumn): SortState {
  if (current && current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

/**
 * Message for a failed calculator request. A 503 in "A valor de hoy" means
 * today's market price is missing for some component; "Al aprobar" does not
 * depend on the market and keeps working.
 */
export function calculatorErrorMessage(status: number | null, mode: ValuationMode): string {
  if (status === 503 && mode === "A_VALOR_HOY") {
    return 'No hay precio de hoy disponible para revalorizar algún componente, por eso no se muestran valores a hoy. Probá con "Al aprobar" o reintentá en unos minutos.';
  }
  if (status === 503) return "El servicio de precios no está disponible. Reintentá en unos minutos.";
  if (status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
  if (status === 403) return "No tenés permisos para ver la calculadora.";
  if (status === 400) return "Revisá los filtros: la campaña o el rango de fechas no es válido.";
  if (status === null) return "Ocurrió un error inesperado. Intentá nuevamente.";
  return `No se pudo cargar la calculadora (código ${status}).`;
}
