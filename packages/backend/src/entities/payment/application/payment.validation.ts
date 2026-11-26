import { InvalidInputError } from '../domain/errors';
import {
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  PaymentKind,
  PaymentMethod,
} from './payment.types';

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new InvalidInputError(`${field} is required`);
  return value.trim();
}

export function requiredDate(value: unknown): Date {
  const date = typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()))
    throw new InvalidInputError('date must be a valid date');
  return date;
}

export function positiveAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new InvalidInputError('amount must be a number greater than 0');
  return value;
}

export function paymentKind(value: unknown): PaymentKind {
  if (!PAYMENT_KINDS.some((kind) => kind === value))
    throw new InvalidInputError('Invalid payment kind');
  return value as PaymentKind;
}

export function paymentMethod(value: unknown): PaymentMethod {
  if (!PAYMENT_METHODS.some((method) => method === value))
    throw new InvalidInputError('Invalid payment method');
  return value as PaymentMethod;
}
