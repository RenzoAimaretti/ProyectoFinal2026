import type {
  ExpenseInput,
  ExpensePreviewDTO,
  ExpenseSuggestionDTO,
  ExpenseSuggestionKind,
  ExpenseSuggestionStatus,
  Grain,
  MoneyUnit,
  TariffBasis,
  TariffComponentDTO,
  UsdRateType,
} from "@/api/client";

/**
 * Pure formatting helpers for the Finanzas section. Amounts arrive from the
 * backend as decimal strings; they are formatted by string/BigInt arithmetic so
 * no digit is lost to binary floats. No runtime imports: this file is loaded
 * directly by `node --test`.
 */

export const GRAINS: Grain[] = ["TRIGO", "MAIZ", "GIRASOL", "SOJA", "SORGO"];

export const GRAIN_LABELS: Record<Grain, string> = {
  TRIGO: "Trigo",
  MAIZ: "Maíz",
  GIRASOL: "Girasol",
  SOJA: "Soja",
  SORGO: "Sorgo",
};

export const UNIT_LABELS: Record<MoneyUnit, string> = {
  ARS: "Pesos (ARS)",
  USD: "Dólares (USD)",
  KG_CEREAL: "Kilos de cereal",
};

export const BASIS_LABELS: Record<TariffBasis, string> = {
  POR_HECTAREA: "Por hectárea",
  POR_HORA: "Por hora",
};

const BASIS_SUFFIX: Record<TariffBasis, string> = {
  POR_HECTAREA: "/ ha",
  POR_HORA: "/ h",
};

const DASH = "—";
const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * Formats a decimal string with es-AR separators (`.` thousands, `,` decimals),
 * rounding half away from zero to `maxDecimals` and trimming trailing zeros
 * down to `minDecimals`. Missing or malformed input renders as a dash: an
 * unknown amount is never shown as 0.
 */
export function formatDecimal(
  value: string | null | undefined,
  minDecimals: number,
  maxDecimals: number,
): string {
  if (typeof value !== "string") return DASH;
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return DASH;

  const [, sign, integer, fraction = ""] = match;
  let units = BigInt(integer + fraction);
  let scale = fraction.length;

  if (scale > maxDecimals) {
    const divisor = BigInt("1" + "0".repeat(scale - maxDecimals));
    const quotient = units / divisor;
    const remainder = units % divisor;
    units = remainder * BigInt(2) >= divisor ? quotient + BigInt(1) : quotient;
    scale = maxDecimals;
  }

  const padded = units.toString().padStart(scale + 1, "0");
  const intPart = padded.slice(0, padded.length - scale);
  let fracPart = padded.slice(padded.length - scale);
  while (fracPart.length > minDecimals && fracPart.endsWith("0")) {
    fracPart = fracPart.slice(0, -1);
  }
  while (fracPart.length < minDecimals) fracPart += "0";

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const isZero = units === BigInt(0);
  return `${sign && !isZero ? "-" : ""}${grouped}${fracPart ? "," + fracPart : ""}`;
}

/** ARS amount: `$ 186.000,00`. */
export function formatArs(value: string | null | undefined): string {
  const text = formatDecimal(value, 2, 4);
  return text === DASH ? DASH : `$ ${text}`;
}

/** USD amount: `US$ 100,00`. */
export function formatUsd(value: string | null | undefined): string {
  const text = formatDecimal(value, 2, 4);
  return text === DASH ? DASH : `US$ ${text}`;
}

/** Kilos: `600 kg`, `509,68 kg`. */
export function formatKg(value: string | null | undefined): string {
  const text = formatDecimal(value, 0, 2);
  return text === DASH ? DASH : `${text} kg`;
}

/**
 * Margin in pesos with an explicit sign when negative: `-$ 8.000,00`. A missing
 * value is a dash, never 0.
 */
export function formatMarginArs(value: string | null | undefined): string {
  const text = formatDecimal(value, 2, 4);
  if (text === DASH) return DASH;
  return text.startsWith("-") ? `-$ ${text.slice(1)}` : `$ ${text}`;
}

/**
 * A profitability ratio (`2.0000` = 200 %) as a percentage with one decimal at
 * most. `null` means the cost is 0 and the ratio is undefined: it shows a dash.
 */
export function formatProfitability(ratio: string | null | undefined): string {
  if (typeof ratio !== "string") return DASH;
  const match = DECIMAL_PATTERN.exec(ratio.trim());
  if (!match) return DASH;

  const [, sign, integer, fraction = ""] = match;
  // ratio x 100 by string arithmetic: no digit goes through a binary float.
  const units = (BigInt(integer + fraction) * BigInt(100)).toString().padStart(fraction.length + 1, "0");
  const percent = `${sign ?? ""}${units.slice(0, units.length - fraction.length)}${
    fraction ? "." + units.slice(units.length - fraction.length) : ""
  }`;
  const text = formatDecimal(percent, 0, 1);
  return text === DASH ? DASH : `${text} %`;
}

/**
 * Banner of the approved reports that still have no value (no tariff yet), or
 * `null` when there are none.
 */
export function describePendingBanner(pending: { reports: number; hectares: string }): string | null {
  if (pending.reports <= 0) return null;
  const hectares = formatDecimal(pending.hectares, 0, 4);
  const area = hectares === DASH ? "" : ` (${hectares} ha)`;
  return pending.reports === 1
    ? `1 parte aprobado sin valorizar${area}. Se valoriza cuando exista una tarifa para su labor.`
    : `${pending.reports} partes aprobados sin valorizar${area}. Se valorizan cuando exista una tarifa para su labor.`;
}

/** One side of a tariff, e.g. `12 kg de soja / ha` or `$ 8.000,00 / h`. */
export function formatTariffComponent(component: TariffComponentDTO): string {
  const suffix = BASIS_SUFFIX[component.basis];

  if (component.unit === "KG_CEREAL") {
    const grain = component.grain ? ` de ${GRAIN_LABELS[component.grain].toLowerCase()}` : "";
    const kg = formatDecimal(component.amount, 0, 4);
    return kg === DASH ? DASH : `${kg} kg${grain} ${suffix}`;
  }

  const text = component.unit === "USD" ? formatUsd(component.amount) : formatArs(component.amount);
  return text === DASH ? DASH : `${text} ${suffix}`;
}

/** Kilos per basis, e.g. `600 kg / ha`; a dash when there is no price. */
export function formatKgPerBasis(value: string | null | undefined, basis: TariffBasis): string {
  const text = formatKg(value);
  return text === DASH ? DASH : `${text} ${BASIS_SUFFIX[basis]}`;
}

export const SUGGESTION_KIND_LABELS: Record<ExpenseSuggestionKind, string> = {
  EDICION: "Edición",
  BAJA: "Baja",
};

export const SUGGESTION_STATUS_LABELS: Record<ExpenseSuggestionStatus, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

/** Lower-case so the label reads inside a sentence: "por dólar (oficial venta)". */
export const USD_RATE_LABELS: Record<UsdRateType, string> = {
  OFICIAL_VENTA: "oficial venta",
  OFICIAL_COMPRA: "oficial compra",
  BNA_PIZARRA: "pizarra BNA",
};

/** An amount in its own unit: `$ 90.000,00`, `US$ 10,00` or `300 kg de maíz`. */
export function formatMoney(
  amount: string | null | undefined,
  unit: MoneyUnit,
  grain: Grain | null | undefined,
): string {
  if (unit === "KG_CEREAL") {
    const kg = formatDecimal(amount, 0, 4);
    if (kg === DASH) return DASH;
    return `${kg} kg${grain ? ` de ${GRAIN_LABELS[grain].toLowerCase()}` : ""}`;
  }
  return unit === "USD" ? formatUsd(amount) : formatArs(amount);
}

/** `dd/mm/aaaa` from the stored UTC day (`2026-11-20T00:00:00.000Z`); never shifted by the local zone. */
export function formatDay(value: string | null | undefined): string {
  if (typeof value !== "string") return DASH;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : DASH;
}

const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** `dd/mm/aaaa hh:mm` of an instant, in Argentina time. */
export function formatValuedAt(
  value: string | null | undefined,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  if (typeof value !== "string") return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;

  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}

/** What the calculator detail knows about how a report or an expense was valued. */
export type ValuationFlags = {
  priceStale: boolean;
  priceFetchedAt: string | null;
  valuedAt: string;
  /** Only reports can be valued late; expenses are valued when loaded. */
  lateValuation?: boolean;
};

/**
 * Labels of the original valuation (at approval or load time), whatever the
 * mode of the amounts. The warnings come first and the valuation date is
 * always the last one.
 */
export function describeValuation(flags: ValuationFlags): string[] {
  const labels: string[] = [];
  if (flags.priceStale) {
    const quoted = flags.priceFetchedAt ? formatValuedAt(flags.priceFetchedAt) : DASH;
    labels.push(
      quoted === DASH
        ? "Precio desactualizado"
        : `Precio desactualizado (cotización del ${quoted})`,
    );
  }
  if (flags.lateValuation) labels.push("Valorización tardía");
  const valued = formatValuedAt(flags.valuedAt);
  labels.push(`Valorizado el ${valued === DASH ? DASH : valued.slice(0, 10)}`);
  return labels;
}

export type ConfirmationRow = { label: string; value: string };

export type ExpenseConfirmation = {
  rows: ConfirmationRow[];
  /** The price comes from an out-of-date cache: the UI warns before saving. */
  stale: boolean;
};

/**
 * Rows of the confirmation summary shown before an expense is saved (D24): what
 * was typed, its value in ARS and the price or rate behind that value. Nothing
 * is persisted until the user confirms.
 */
export function buildExpenseConfirmation(args: {
  lotName: string;
  categoryName: string;
  input: Pick<ExpenseInput, "date" | "description" | "amount" | "unit" | "grain">;
  preview: ExpensePreviewDTO;
}): ExpenseConfirmation {
  const { lotName, categoryName, input, preview } = args;

  const rows: ConfirmationRow[] = [
    { label: "Lote", value: lotName },
    { label: "Categoría", value: categoryName },
    { label: "Fecha del gasto", value: formatDay(input.date) },
    { label: "Descripción", value: input.description },
    { label: "Monto cargado", value: formatMoney(preview.amount, preview.unit, preview.grain) },
    { label: "Valor en pesos", value: formatArs(preview.amountArs) },
  ];

  if (preview.unit === "KG_CEREAL" && preview.grainArsPerTon !== null) {
    const grain = preview.grain ? ` de ${GRAIN_LABELS[preview.grain].toLowerCase()}` : "";
    rows.push({
      label: "Precio utilizado",
      value: `${formatArs(preview.grainArsPerTon)} por tonelada${grain}`,
    });
  } else if (preview.unit === "USD" && preview.usdRate !== null) {
    const type = preview.usdRateType ? ` (${USD_RATE_LABELS[preview.usdRateType]})` : "";
    rows.push({
      label: "Precio utilizado",
      value: `${formatArs(preview.usdRate)} por dólar${type}`,
    });
  }

  if (preview.priceSource) rows.push({ label: "Fuente", value: preview.priceSource });
  rows.push({ label: "Valorizado el", value: formatValuedAt(preview.valuedAt) });

  return { rows, stale: preview.priceStale };
}

/**
 * Human-readable lines of what a suggestion proposes. Only the proposed fields
 * are listed; a proposed amount, unit or grain is shown as one "Monto" line that
 * borrows whatever part was not proposed from the expense itself.
 */
export function describeProposedChanges(
  suggestion: Pick<ExpenseSuggestionDTO, "kind" | "proposed" | "expense">,
  names: { lot: (id: string) => string; category: (id: string) => string },
): ConfirmationRow[] {
  if (suggestion.kind === "BAJA") {
    return [{ label: "Propuesta", value: "Dar de baja el gasto" }];
  }

  const { proposed, expense } = suggestion;
  const rows: ConfirmationRow[] = [];

  if (proposed.lotId !== null) rows.push({ label: "Lote", value: names.lot(proposed.lotId) });
  if (proposed.categoryId !== null) {
    rows.push({ label: "Categoría", value: names.category(proposed.categoryId) });
  }
  if (proposed.date !== null) rows.push({ label: "Fecha", value: formatDay(proposed.date) });
  if (proposed.description !== null) {
    rows.push({ label: "Descripción", value: proposed.description });
  }

  if (proposed.amount !== null || proposed.unit !== null || proposed.grain !== null) {
    const unit = proposed.unit ?? expense.unit;
    const grain = proposed.grain ?? (unit === "KG_CEREAL" ? expense.grain : null);
    rows.push({ label: "Monto", value: formatMoney(proposed.amount ?? expense.amount, unit, grain) });
  }

  return rows;
}
