import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LivestockEventRepositoryPort } from '../../application/livestock-event.ports';
import {
  CreateLivestockEventData,
  LivestockEventRecord,
  UpdateLivestockEventData,
} from '../../application/livestock-event.types';

@Injectable()
export class PrismaLivestockEventRepository
  implements LivestockEventRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<LivestockEventRecord[]> {
    return this.prisma.livestockEvent.findMany();
  }

  findById(id: string): Promise<LivestockEventRecord | null> {
    return this.prisma.livestockEvent.findUnique({ where: { id } });
  }

  create(data: CreateLivestockEventData): Promise<LivestockEventRecord> {
    return this.prisma.livestockEvent.create({
      data: {
        eventDate: data.eventDate,
        type: data.eventType,
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
        ...(data.dose !== undefined ? { dose: data.dose } : {}),
      },
    });
  }

  update(id: string, data: UpdateLivestockEventData): Promise<LivestockEventRecord> {
    return this.prisma.livestockEvent.update({
      where: { id },
      data: {
        ...(data.eventDate !== undefined ? { eventDate: data.eventDate } : {}),
        ...(data.eventType !== undefined ? { type: data.eventType } : {}),
        ...(data.livestockId !== undefined ? { livestockId: data.livestockId } : {}),
        ...(data.operatorId !== undefined ? { operatorId: data.operatorId } : {}),
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
        ...(data.dose !== undefined ? { dose: data.dose } : {}),
      },
    });
  }
}
