import {
  ReceptionItemRecord,
  ReceptionRecord,
} from '../../application/reception.types';
import { itemQuantityVariance } from '../../domain/reception.rules';
import { ReceptionStatus } from '../../domain/reception-status';

export const RECEPTION_ITEM_ORDER_BY = {
  orderBy: [{ id: 'asc' as const }],
};

export type ReceptionItemRow = {
  id: string;
  receptionId: string;
  inputId: string;
  quantity: number;
  validatedQuantity: number | null;
  unit: string;
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
    items: reception.items.map(
      (item): ReceptionItemRecord => ({
        id: item.id,
        receptionId: item.receptionId,
        inputId: item.inputId,
        quantity: item.quantity,
        validatedQuantity: item.validatedQuantity,
        quantityVariance: itemQuantityVariance({
          quantity: item.quantity,
          validatedQuantity: item.validatedQuantity,
        }),
        unit: item.unit,
      }),
    ),
  };
}
