import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReceptionRepositoryPort } from '../../application/reception.ports';
import {
  CreateReceptionData,
  ReceptionRecord,
} from '../../application/reception.types';
import {
  RECEPTION_ITEM_ORDER_BY,
  toReceptionRecord,
} from './reception.mapper';

@Injectable()
export class PrismaReceptionRepository implements ReceptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReceptionData): Promise<ReceptionRecord> {
    const reception = await this.prisma.reception.create({
      data: {
        clientId: data.clientId,
        date: data.date,
        status: data.status,
        items: {
          create: data.items.map((item) => ({
            inputId: item.inputId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: { items: RECEPTION_ITEM_ORDER_BY },
    });

    return toReceptionRecord(reception);
  }

  async findByIdForClient(
    id: string,
    clientId: string,
  ): Promise<ReceptionRecord | null> {
    const reception = await this.prisma.reception.findFirst({
      where: { id, clientId },
      include: { items: RECEPTION_ITEM_ORDER_BY },
    });

    return reception ? toReceptionRecord(reception) : null;
  }

  async findAllByClient(clientId: string): Promise<ReceptionRecord[]> {
    const receptions = await this.prisma.reception.findMany({
      where: { clientId },
      include: { items: RECEPTION_ITEM_ORDER_BY },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return receptions.map((reception) => toReceptionRecord(reception));
  }
}
