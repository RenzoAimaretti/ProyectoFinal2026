import {
  ReceptionItemRecord,
  ReceptionRecord,
} from '../../application/reception.types';
import { itemQuantityVariance } from '../../domain/reception.rules';
import { ReceptionStatus } from '../../domain/reception-status';

/**
 * Items are always read together with the catalogue name of their input so the
 * inbound adapter can expose `inputName` without an extra round trip.
 */
export const RECEPTION_ITEM_INCLUDE = {
  orderBy: [{ id: 'asc' as const }],
  include: { input: { select: { name: true as const } } },
};

/**
 * Receptions are always read together with the name of the owning client and
 * the catalogue name of each item input. These are additive read enrichments:
 * existing columns and their mapping stay untouched.
 */
export const RECEPTION_INCLUDE = {
  client: { select: { name: true as const } },
  items: RECEPTION_ITEM_INCLUDE,
};

export type ReceptionItemRow = {
  id: string;
  receptionId: string;
  inputId: string;
  quantity: number;
  validatedQuantity: number | null;
  unit: string;
  input?: { name: string } | null;
};

export type ReceptionRow = {
  id: string;
  clientId: string;
  date: Date;
  status: ReceptionStatus;
  rejectionReason: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { name: string } | null;
  items: ReceptionItemRow[];
};

export function toReceptionRecord(reception: ReceptionRow): ReceptionRecord {
  return {
    id: reception.id,
    clientId: reception.clientId,
    date: reception.date,
    status: reception.status,
    rejectionReason: reception.rejectionReason,
    validatedBy: reception.validatedBy,
    validatedAt: reception.validatedAt,
    createdAt: reception.createdAt,
    updatedAt: reception.updatedAt,
    clientName: reception.client?.name,
    items: reception.items.map((item): ReceptionItemRecord => {
      const quantityVariance = itemQuantityVariance({
        quantity: item.quantity,
        validatedQuantity: item.validatedQuantity,
      });

      return {
        id: item.id,
        receptionId: item.receptionId,
        inputId: item.inputId,
        quantity: item.quantity,
        validatedQuantity: item.validatedQuantity,
        quantityVariance,
        ...(quantityVariance !== null ? { variance: quantityVariance } : {}),
        inputName: item.input?.name,
        unit: item.unit,
      };
    }),
  };
}
