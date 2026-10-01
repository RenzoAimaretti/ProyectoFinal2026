import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReceptionRepositoryPort } from '../../application/reception.ports';
import {
  CreateReceptionData,
  ReceptionRecord,
} from '../../application/reception.types';
import { RECEPTION_INCLUDE, toReceptionRecord } from './reception.mapper';

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
      include: RECEPTION_INCLUDE,
    });

    return toReceptionRecord(reception);
  }

  async findByIdForClient(
    id: string,
    clientId: string,
  ): Promise<ReceptionRecord | null> {
    const reception = await this.prisma.reception.findFirst({
      where: { id, clientId },
      include: RECEPTION_INCLUDE,
    });

    return reception ? toReceptionRecord(reception) : null;
  }

  async findAllByClient(clientId: string): Promise<ReceptionRecord[]> {
    const receptions = await this.prisma.reception.findMany({
      where: { clientId },
      include: RECEPTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return receptions.map((reception) => toReceptionRecord(reception));
  }

  async findAllByTenant(tenantId: string): Promise<ReceptionRecord[]> {
    const receptions = await this.prisma.reception.findMany({
      where: { client: { tenantId } },
      include: RECEPTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return receptions.map((reception) => toReceptionRecord(reception));
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ReceptionRecord | null> {
    const reception = await this.prisma.reception.findFirst({
      where: { id, client: { tenantId } },
      include: RECEPTION_INCLUDE,
    });

    return reception ? toReceptionRecord(reception) : null;
  }
}
