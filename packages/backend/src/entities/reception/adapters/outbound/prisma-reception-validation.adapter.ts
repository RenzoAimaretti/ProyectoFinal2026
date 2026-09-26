import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReceptionValidationPort } from '../../application/reception.ports';
import {
  RejectReceptionData,
  ReceptionRecord,
  ValidateReceptionData,
} from '../../application/reception.types';
import {
  EntityNotFoundError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { assertValidationCoversItems } from '../../domain/reception.rules';
import {
  RECEPTION_INITIAL_STATUS,
  RECEPTION_REJECTED_STATUS,
  RECEPTION_VALIDATED_STATUS,
} from '../../domain/reception-status';
import {
  RECEPTION_ITEM_ORDER_BY,
  toReceptionRecord,
} from './reception.mapper';

/**
 * The stock entries of a validated reception and the reception status change
 * must succeed or fail together: a validated reception without stock would lose
 * the delivery, and stock without a validated reception would be untraceable.
 * Prisma cannot span feature repositories inside a single transaction, so this
 * adapter owns the transaction and writes both tables through the guarded,
 * client-scoped keys.
 *
 * The stock always moves by the agreed `validatedQuantity` of each item and
 * never by the expected `quantity` declared at creation (R014): the expected
 * amount stays stored only so the shortage or surplus of the delivery remains
 * observable as validated minus expected (R015).
 */
@Injectable()
export class PrismaReceptionValidationAdapter
  implements ReceptionValidationPort
{
  constructor(private readonly prisma: PrismaService) {}

  async validateWithStock(
    data: ValidateReceptionData,
  ): Promise<ReceptionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const reception = await tx.reception.findFirst({
        where: { id: data.id, clientId: data.clientId },
        include: { items: RECEPTION_ITEM_ORDER_BY },
      });

      if (!reception) {
        throw new EntityNotFoundError(`Reception with id ${data.id} not found`);
      }

      if (reception.status !== RECEPTION_INITIAL_STATUS) {
        throw new InvalidStateTransitionError(
          `A reception in status ${reception.status} cannot be validated`,
        );
      }

      assertValidationCoversItems(reception.items, data.items);

      const validatedByInputId = new Map(
        data.items.map((item) => [item.inputId, item.validatedQuantity]),
      );

      for (const item of reception.items) {
        const validatedQuantity = validatedByInputId.get(
          item.inputId,
        ) as number;

        const { count: itemCount } = await tx.receptionItem.updateMany({
          where: { id: item.id, receptionId: reception.id },
          data: { validatedQuantity },
        });

        if (itemCount === 0) {
          throw new EntityNotFoundError(
            `Reception item with id ${item.id} not found`,
          );
        }

        await tx.stock.upsert({
          where: {
            clientId_inputId: {
              clientId: reception.clientId,
              inputId: item.inputId,
            },
          },
          create: {
            clientId: reception.clientId,
            inputId: item.inputId,
            quantity: validatedQuantity,
          },
          update: { quantity: { increment: validatedQuantity } },
        });
      }

      const { count } = await tx.reception.updateMany({
        where: {
          id: reception.id,
          clientId: reception.clientId,
          status: RECEPTION_INITIAL_STATUS,
        },
        data: {
          status: RECEPTION_VALIDATED_STATUS,
          validatedBy: data.validatedBy,
          validatedAt: data.validatedAt,
        },
      });

      if (count === 0) {
        throw new InvalidStateTransitionError(
          `Reception with id ${reception.id} was already decided`,
        );
      }

      const stored = await tx.reception.findFirstOrThrow({
        where: { id: reception.id, clientId: reception.clientId },
        include: { items: RECEPTION_ITEM_ORDER_BY },
      });

      return toReceptionRecord(stored);
    });
  }

  async reject(data: RejectReceptionData): Promise<ReceptionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const reception = await tx.reception.findFirst({
        where: { id: data.id, clientId: data.clientId },
        include: { items: RECEPTION_ITEM_ORDER_BY },
      });

      if (!reception) {
        throw new EntityNotFoundError(`Reception with id ${data.id} not found`);
      }

      if (reception.status !== RECEPTION_INITIAL_STATUS) {
        throw new InvalidStateTransitionError(
          `A reception in status ${reception.status} cannot be rejected`,
        );
      }

      const { count } = await tx.reception.updateMany({
        where: {
          id: reception.id,
          clientId: reception.clientId,
          status: RECEPTION_INITIAL_STATUS,
        },
        data: {
          status: RECEPTION_REJECTED_STATUS,
          rejectionReason: data.rejectionReason,
        },
      });

      if (count === 0) {
        throw new InvalidStateTransitionError(
          `Reception with id ${reception.id} was already decided`,
        );
      }

      const stored = await tx.reception.findFirstOrThrow({
        where: { id: reception.id, clientId: reception.clientId },
        include: { items: RECEPTION_ITEM_ORDER_BY },
      });

      return toReceptionRecord(stored);
    });
  }
}
