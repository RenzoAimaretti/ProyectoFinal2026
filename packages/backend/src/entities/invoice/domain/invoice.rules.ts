import { InvalidInputError } from './errors';

export type PricedItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taskId?: string;
};
export type CalculatedItem = PricedItem & { amount: number };

export function calculateInvoiceItems(items: PricedItem[]): {
  items: CalculatedItem[];
  totalAmount: number;
} {
  if (!Array.isArray(items) || items.length === 0) {
    throw new InvalidInputError('items must contain at least one line');
  }
  const calculated = items.map((item, index) => {
    if (
      !item ||
      typeof item.description !== 'string' ||
      !item.description.trim()
    ) {
      throw new InvalidInputError(`items[${index}].description is required`);
    }
    for (const field of ['quantity', 'unitPrice'] as const) {
      if (
        typeof item[field] !== 'number' ||
        !Number.isFinite(item[field]) ||
        item[field] <= 0
      ) {
        throw new InvalidInputError(
          `items[${index}].${field} must be positive`,
        );
      }
    }
    const amount = item.quantity * item.unitPrice;
    if (!Number.isFinite(amount))
      throw new InvalidInputError('item amount must be finite');
    return { ...item, description: item.description.trim(), amount };
  });
  const totalAmount = calculated.reduce(
    (total, item) => total + item.amount,
    0,
  );
  if (!Number.isFinite(totalAmount))
    throw new InvalidInputError('total amount must be finite');
  return { items: calculated, totalAmount };
}
