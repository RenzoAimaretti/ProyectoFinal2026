import type {
  ExpenseChangesInput,
  ExpenseDTO,
  ExpenseInput,
  ExpensePreviewInput,
  Grain,
  MoneyUnit,
} from "@/api/client";

/**
 * Pure state, validation and diffing of the expense form. Validation here only
 * improves the UX: the backend validates again (400) and is the source of truth.
 */

export type ExpenseFormState = {
  lotId: string;
  categoryId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  description: string;
  amount: string;
  unit: MoneyUnit;
  /** Empty string while no grain is chosen. */
  grain: Grain | "";
};

export type ExpenseFormErrors = Partial<Record<"lotId" | "categoryId" | "date" | "description" | "amount" | "grain", string>>;

export type ExpenseFormResult =
  | { ok: true; input: ExpenseInput }
  | { ok: false; errors: ExpenseFormErrors };

/** The local calendar day as `YYYY-MM-DD` (the UTC day would jump ahead in the evening). */
export function todayLocal(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyExpenseForm(today: string): ExpenseFormState {
  return {
    lotId: "",
    categoryId: "",
    date: today,
    description: "",
    amount: "",
    unit: "ARS",
    grain: "",
  };
}

/** `300.0000` -> `300`, `8000.5000` -> `8000.5`. */
function trimAmount(amount: string): string {
  return amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount;
}

export function expenseToForm(expense: Pick<
  ExpenseDTO,
  "lotId" | "categoryId" | "date" | "description" | "amount" | "unit" | "grain"
>): ExpenseFormState {
  return {
    lotId: expense.lotId,
    categoryId: expense.categoryId,
    date: expense.date.slice(0, 10),
    description: expense.description,
    amount: trimAmount(expense.amount),
    unit: expense.unit,
    grain: expense.grain ?? "",
  };
}

function isCalendarDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function validateExpenseForm(form: ExpenseFormState): ExpenseFormResult {
  const errors: ExpenseFormErrors = {};

  if (form.lotId.trim() === "") errors.lotId = "Elegí el lote.";
  if (form.categoryId.trim() === "") errors.categoryId = "Elegí la categoría.";
  if (!isCalendarDay(form.date.trim())) errors.date = "Ingresá una fecha válida.";

  const description = form.description.trim();
  if (description === "") errors.description = "Ingresá una descripción.";

  const amount = form.amount.trim().replace(",", ".");
  if (amount === "") {
    errors.amount = "Ingresá el monto (0 es un valor válido).";
  } else if (!/^\d+(\.\d{1,4})?$/.test(amount)) {
    errors.amount = "El monto debe ser un número de 0 o más, con hasta 4 decimales.";
  }

  if (form.unit === "KG_CEREAL" && form.grain === "") {
    errors.grain = "Elegí el grano.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const input: ExpenseInput = {
    lotId: form.lotId.trim(),
    categoryId: form.categoryId.trim(),
    date: form.date.trim(),
    description,
    amount,
    unit: form.unit,
  };
  // The grain only applies to kilos of cereal: never send a leftover one.
  if (form.unit === "KG_CEREAL" && form.grain !== "") input.grain = form.grain;
  return { ok: true, input };
}

/** Money fields for `POST /expenses/preview`. */
export function previewPayload(input: ExpenseInput): ExpensePreviewInput {
  const payload: ExpensePreviewInput = { amount: input.amount, unit: input.unit };
  if (input.grain) payload.grain = input.grain;
  return payload;
}

/**
 * Fields of `input` that differ from the stored expense, or `null` when nothing
 * changed. A change of amount, unit or grain sends the whole money triplet so
 * the server never has to guess the missing half.
 */
export function expenseChanges(
  original: Pick<
    ExpenseDTO,
    "lotId" | "categoryId" | "date" | "description" | "amount" | "unit" | "grain"
  >,
  input: ExpenseInput,
): ExpenseChangesInput | null {
  const changes: ExpenseChangesInput = {};

  if (input.lotId !== original.lotId) changes.lotId = input.lotId;
  if (input.categoryId !== original.categoryId) changes.categoryId = input.categoryId;
  if (input.date !== original.date.slice(0, 10)) changes.date = input.date;
  if (input.description !== original.description) changes.description = input.description;

  const moneyChanged =
    trimAmount(input.amount) !== trimAmount(original.amount) ||
    input.unit !== original.unit ||
    (input.grain ?? null) !== (original.grain ?? null);
  if (moneyChanged) {
    changes.amount = trimAmount(input.amount);
    changes.unit = input.unit;
    if (input.grain) changes.grain = input.grain;
  }

  return Object.keys(changes).length === 0 ? null : changes;
}
