export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');

// Entidad de aplicación: fila completa de Farm, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type FarmEntity = {
  id: string;
  companyId: string;
  name: string;
  location: string | null;
  surface: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

// Mismos shapes que las firmas inline del service actual (T-F2-15 conserva el
// contrato byte-idéntico: el controller pasa location como string).
export type CreateFarmData = {
  name: string;
  location: string;
  companyId: string;
  surface: number;
};

export type UpdateFarmData = {
  name?: string;
  location?: string;
  companyId?: string;
  surface?: number;
};

export interface FarmRepositoryPort {
  findAll(): Promise<FarmEntity[]>;
  findById(id: string): Promise<FarmEntity | null>;
  // Reemplaza el include { farms } del prisma actual del addLiveStock de lot:
  // la lista de farms de una empresa es una lectura del agregado Farm
  // (T-F2-18/20).
  findByCompany(companyId: string): Promise<FarmEntity[]>;
  findByNameAndCompany(
    name: string,
    companyId: string,
  ): Promise<FarmEntity | null>;
  create(data: CreateFarmData): Promise<FarmEntity>;
  update(id: string, data: UpdateFarmData): Promise<FarmEntity>;
}
