import { EventType } from '../domain/event-type';

export const LIVESTOCK_EVENT_REPOSITORY = Symbol('LIVESTOCK_EVENT_REPOSITORY');

// Entidad de aplicación: fila completa de LivestockEvent, byte-idéntica a lo que
// hoy devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type LivestockEventEntity = {
  id: string;
  livestockId: string;
  operatorId: string | null;
  type: EventType;
  observations: string | null;
  vaccine: string | null;
  dose: number | null;
  eventDate: Date;
  createdAt: Date;
};

export type CreateLivestockEventData = {
  eventDate: Date;
  type: EventType;
  livestockId: string;
  operatorId: string;
  observations?: string;
  vaccine?: string;
  dose?: number;
};

// vaccine/dose admiten null explícito: el service fuerza null cuando eventType
// no es VACUNACION (comportamiento legacy de livestock-event.service.ts líneas
// 84-89, byte-idéntico preservado — REQ-C-01/03).
export type UpdateLivestockEventData = {
  eventDate?: Date;
  type?: EventType;
  livestockId?: string;
  operatorId?: string;
  observations?: string | null;
  vaccine?: string | null;
  dose?: number | null;
};

export interface LivestockEventRepositoryPort {
  findAll(): Promise<LivestockEventEntity[]>;
  findById(id: string): Promise<LivestockEventEntity | null>;
  create(data: CreateLivestockEventData): Promise<LivestockEventEntity>;
  update(
    id: string,
    data: UpdateLivestockEventData,
  ): Promise<LivestockEventEntity>;
}
