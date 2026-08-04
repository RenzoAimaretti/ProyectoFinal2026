// Puertos del módulo livestock-movement (REQ-A-01). Espeja las llamadas prisma
// del legacy livestock-movement.service.ts (findMany, findUnique, create) y las
// entidades tal como las devuelve Prisma hoy (byte-idéntico). El legacy NO tiene
// update ni delete (no existen métodos en el service ni rutas en el controller).

export const LIVESTOCK_MOVEMENT_REPOSITORY = Symbol(
  'LIVESTOCK_MOVEMENT_REPOSITORY',
);

export type LivestockMovementEntity = {
  id: string;
  livestockId: string;
  lotId: string;
  movementDate: Date;
  observations: string | null;
  createdAt: Date;
};

// movementDate acepta Date | string porque el body HTTP llega como string ISO
// (JSON) y el legacy lo pasaba crudo a Prisma (que lo convierte); el spec pasa
// Date. El service no transforma nada — byte-idéntico al legacy (REQ-C-03).
export type CreateLivestockMovementData = {
  livestockId: string;
  lotId: string;
  movementDate: Date | string;
  observations?: string;
};

export interface LivestockMovementRepositoryPort {
  findAll(): Promise<LivestockMovementEntity[]>;
  findById(id: string): Promise<LivestockMovementEntity | null>;
  create(data: CreateLivestockMovementData): Promise<LivestockMovementEntity>;
}
