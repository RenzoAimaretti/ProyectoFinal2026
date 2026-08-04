export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');

// Entidad de aplicación: fila completa de Lot, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type LotEntity = {
  id: string;
  farmId: string;
  name: string;
  coords: string | null;
  area: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

// Mismos shapes que las firmas inline del service actual (T-F2-20 conserva el
// contrato byte-idéntico: el controller pasa coords como string obligatoria).
export type CreateLotData = {
  name: string;
  farmId: string;
  coords: string;
  area: number;
};

export type UpdateLotData = {
  name?: string;
  farmId?: string;
  coords?: string;
  area?: number;
  active?: boolean;
};

export interface LotRepositoryPort {
  findAll(): Promise<LotEntity[]>;
  findById(id: string): Promise<LotEntity | null>;
  findByNameAndFarm(name: string, farmId: string): Promise<LotEntity | null>;
  create(data: CreateLotData): Promise<LotEntity>;
  update(id: string, data: UpdateLotData): Promise<LotEntity>;
  // Lot-side connect: reemplaza el prisma.lot.update({livestock: {connect}})
  // del addLiveStock actual (T-F2-20, opción 2 de T-F2-18). La escritura del
  // lado livestock la compone el service vía LIVESTOCK_REPOSITORY.update.
  assignStock(lotId: string, stockId: string): Promise<LotEntity>;
}
