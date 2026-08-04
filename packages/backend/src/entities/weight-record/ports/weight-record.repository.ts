export const WEIGHT_RECORD_REPOSITORY = Symbol('WEIGHT_RECORD_REPOSITORY');

// Entidad de aplicación: fila completa de WeightRecord, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type WeightRecordEntity = {
  id: string;
  livestockId: string;
  operatorId: string | null;
  weight: number;
  measuredAt: Date;
  createdAt: Date;
};

export type CreateWeightRecordData = {
  livestockId: string;
  operatorId: string;
  weight: number;
  measuredAt: Date;
};

export type UpdateWeightRecordData = {
  operatorId?: string;
  weight?: number;
  measuredAt?: Date;
};

export interface WeightRecordRepositoryPort {
  findAll(): Promise<WeightRecordEntity[]>;
  findById(id: string): Promise<WeightRecordEntity | null>;
  create(data: CreateWeightRecordData): Promise<WeightRecordEntity>;
  update(id: string, data: UpdateWeightRecordData): Promise<WeightRecordEntity>;
  // Devuelve la entidad eliminada; el service arma el { message } de respuesta
  // (comportamiento legacy de weight-record.service.ts líneas 22-23, REQ-C-01).
  delete(id: string): Promise<WeightRecordEntity>;
}
