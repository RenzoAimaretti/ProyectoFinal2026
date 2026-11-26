import type {
  Grain,
  MoneyUnit,
  TariffBasis,
  TariffDTO,
  TariffInput,
} from "@/api/client";

/**
 * Pure state and validation of the tariff form. Validation here only improves
 * the UX: the backend validates again (400) and is the source of truth.
 */

export type TariffSideForm = {
  amount: string;
  unit: MoneyUnit;
  /** Empty string while no grain is chosen. */
  grain: Grain | "";
  basis: TariffBasis;
};

export type TariffFormState = {
  price: TariffSideForm;
  cost: TariffSideForm;
};

export type TariffFormErrors = { price?: string; cost?: string };

export type TariffFormResult =
  | { ok: true; input: TariffInput }
  | { ok: false; errors: TariffFormErrors };

const emptySide = (): TariffSideForm => ({
  amount: "",
  unit: "ARS",
  grain: "",
  basis: "POR_HECTAREA",
});

export function emptyTariffForm(): TariffFormState {
  return { price: emptySide(), cost: { ...emptySide(), basis: "POR_HORA" } };
}

/** `12.0000` -> `12`, `8000.5000` -> `8000.5`. */
function trimAmount(amount: string): string {
  return amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount;
}

export function tariffToForm(tariff: TariffDTO): TariffFormState {
  const side = (component: TariffDTO["price"]): TariffSideForm => ({
    amount: trimAmount(component.amount),
    unit: component.unit,
    grain: component.grain ?? "",
    basis: component.basis,
  });
  return { price: side(tariff.price), cost: side(tariff.cost) };
}

type SideResult =
  | { ok: true; side: TariffInput["price"] }
  | { ok: false; error: string };

function validateSide(side: TariffSideForm, label: string): SideResult {
  const normalized = side.amount.trim().replace(",", ".");
  if (normalized === "") {
    return { ok: false, error: `Ingresá el ${label} (0 es un valor válido).` };
  }
  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) {
    return {
      ok: false,
      error: `El ${label} debe ser un número de 0 o más, con hasta 4 decimales.`,
    };
  }
  if (side.unit === "KG_CEREAL") {
    if (side.grain === "") return { ok: false, error: `Elegí el grano del ${label}.` };
    return {
      ok: true,
      side: { amount: normalized, unit: side.unit, grain: side.grain, basis: side.basis },
    };
  }
  // The grain only applies to kilos of cereal: never send a leftover one.
  return { ok: true, side: { amount: normalized, unit: side.unit, basis: side.basis } };
}

export function validateTariffForm(form: TariffFormState): TariffFormResult {
  const price = validateSide(form.price, "precio");
  const cost = validateSide(form.cost, "costo estándar");

  if (price.ok && cost.ok) {
    return { ok: true, input: { price: price.side, cost: cost.side } };
  }

  const errors: TariffFormErrors = {};
  if (!price.ok) errors.price = price.error;
  if (!cost.ok) errors.cost = cost.error;
  return { ok: false, errors };
}
