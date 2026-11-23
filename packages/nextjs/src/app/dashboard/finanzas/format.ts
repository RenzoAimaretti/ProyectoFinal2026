import type { Grain, MoneyUnit, TariffBasis, TariffComponentDTO } from "@/api/client";

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
