export const MODULE_ENTITY_REPOSITORY = Symbol('MODULE_ENTITY_REPOSITORY');

// Entidad de aplicación: fila completa de Module, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Módulo hoja: no tiene lecturas
// cruzadas a otras entidades (T-F2-02).
export type ModuleEntity = {
  id: string;
  name: string;
  price: number;
  version: string;
  createdAt: Date;
};

export type CreateModuleData = {
  name: string;
  price: number;
  version: string;
};

// companyId se conserva en la firma pública (controller) aunque Prisma lo
// rechace en runtime — comportamiento byte-idéntico (REQ-C-01/03).
export type UpdateModuleData = {
  name?: string;
  price?: number;
  version?: string;
  companyId?: string;
};

export interface ModuleEntityRepositoryPort {
  findAll(): Promise<ModuleEntity[]>;
  findById(id: string): Promise<ModuleEntity | null>;
  findByName(name: string): Promise<ModuleEntity | null>;
  create(data: CreateModuleData): Promise<ModuleEntity>;
  update(id: string, data: UpdateModuleData): Promise<ModuleEntity>;
}
