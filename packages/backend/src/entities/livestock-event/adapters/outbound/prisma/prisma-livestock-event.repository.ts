import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { EventType as PrismaEventType } from '../../../../../../prisma/generated/client';
import { EventType } from '../../../domain/event-type';
import {
  CreateLivestockEventData,
  LivestockEventEntity,
  LivestockEventRepositoryPort,
  UpdateLivestockEventData,
} from '../../../ports/livestock-event.repository';

// Mapeo explícito generado ↔ dominio (REQ-A-04): el enum generado por Prisma es un
// const object; la copia de dominio es un enum TS con miembros idénticos. Este es
// el ÚNICO archivo del módulo livestock-event que importa prisma/generated (REQ-A-04).
const PRISMA_EVENT_TYPE_TO_DOMAIN: Record<PrismaEventType, EventType> = {
  VACUNACION: EventType.VACUNACION,
  TRATAMIENTO: EventType.TRATAMIENTO,
  CASTRACION: EventType.CASTRACION,
  INSEMINACION: EventType.INSEMINACION,
  PARTO: EventType.PARTO,
  ENFERMEDAD: EventType.ENFERMEDAD,
};

const DOMAIN_EVENT_TYPE_TO_PRISMA: Record<EventType, PrismaEventType> = {
  [EventType.VACUNACION]: 'VACUNACION',
  [EventType.TRATAMIENTO]: 'TRATAMIENTO',
  [EventType.CASTRACION]: 'CASTRACION',
  [EventType.INSEMINACION]: 'INSEMINACION',
  [EventType.PARTO]: 'PARTO',
  [EventType.ENFERMEDAD]: 'ENFERMEDAD',
};

// Fila escalar de Prisma (type en el enum generado) — base del mapeo a entidad.
type LivestockEventRow = Omit<LivestockEventEntity, 'type'> & {
  type: PrismaEventType;
};

@Injectable()
export class PrismaLivestockEventRepository implements LivestockEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LivestockEventEntity[]> {
    const rows = await this.prisma.livestockEvent.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<LivestockEventEntity | null> {
    const row = await this.prisma.livestockEvent.findUnique({
      where: { id },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateLivestockEventData): Promise<LivestockEventEntity> {
    const row = await this.prisma.livestockEvent.create({
      data: {
        eventDate: data.eventDate,
        type: DOMAIN_EVENT_TYPE_TO_PRISMA[data.type],
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        ...(data.observations !== undefined
          ? { observations: data.observations }
          : {}),
        ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
        ...(data.dose !== undefined ? { dose: data.dose } : {}),
      },
    });
    return this.toEntity(row);
  }

  async update(
    id: string,
    data: UpdateLivestockEventData,
  ): Promise<LivestockEventEntity> {
    const row = await this.prisma.livestockEvent.update({
      where: { id },
      data: {
        ...(data.eventDate !== undefined ? { eventDate: data.eventDate } : {}),
        ...(data.type !== undefined
          ? { type: DOMAIN_EVENT_TYPE_TO_PRISMA[data.type] }
          : {}),
        ...(data.livestockId !== undefined
          ? { livestockId: data.livestockId }
          : {}),
        ...(data.operatorId !== undefined
          ? { operatorId: data.operatorId }
          : {}),
        ...(data.observations !== undefined
          ? { observations: data.observations }
          : {}),
        ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
        ...(data.dose !== undefined ? { dose: data.dose } : {}),
      },
    });
    return this.toEntity(row);
  }

  private toEntity(row: LivestockEventRow): LivestockEventEntity {
    return {
      id: row.id,
      livestockId: row.livestockId,
      operatorId: row.operatorId,
      type: PRISMA_EVENT_TYPE_TO_DOMAIN[row.type],
      observations: row.observations,
      vaccine: row.vaccine,
      dose: row.dose,
      eventDate: row.eventDate,
      createdAt: row.createdAt,
    };
  }
}
