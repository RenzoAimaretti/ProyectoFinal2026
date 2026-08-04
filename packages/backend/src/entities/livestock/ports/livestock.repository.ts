import { LivestockStatus } from '../domain/livestock-status';

export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');

// Entidad de aplicación: fila completa de Livestock, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F1-02, D4/REQ-A-02). El adapter mapea el enum generado
// ↔ LivestockStatus de dominio (REQ-A-04).
export type LivestockEntity = {
  id: string;
  companyId: string;
  lotId: string | null;
  tagNumber: string;
  species: string;
  breed: string | null;
  sex: string;
  birthDate: Date | null;
  status: LivestockStatus;
  entryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateLivestockData = {
  companyId: string;
  lotId: string | null;
  tagNumber: string;
  breed: string | null;
  species: string;
  birthDate: Date | undefined;
  sex: string;
};

export type UpdateLivestockData = {
  companyId?: string;
  lotId?: string | null;
  tagNumber?: string;
  breed?: string | null;
  species?: string;
  birthDate?: Date;
  sex?: string;
  status?: LivestockStatus;
};

export interface LivestockRepositoryPort {
  findAll(): Promise<LivestockEntity[]>;
  findById(id: string): Promise<LivestockEntity | null>;
  // Fila completa incl. lot.farm (el include lo hace el adapter); el servicio
  // solo usa los campos escalares — comportamiento byte-idéntico (REQ-C-01).
  findByIdWithLotFarm(id: string): Promise<LivestockEntity | null>;
  findByTagNumber(tagNumber: string): Promise<LivestockEntity | null>;
  findByTagNumberExcluding(
    tagNumber: string,
    excludeId: string,
  ): Promise<LivestockEntity | null>;
  create(data: CreateLivestockData): Promise<LivestockEntity>;
  update(id: string, data: UpdateLivestockData): Promise<LivestockEntity>;
  delete(id: string): Promise<LivestockEntity>;
}
