export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');

// Entidad de aplicación: fila completa de Company, byte-idéntica a lo que hoy
// devuelve Prisma (REQ-F2-02, D4/REQ-A-02). Sin relaciones.
export type CompanyEntity = {
  id: string;
  name: string;
  cuit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

// Referencia mínima de módulo para el check de duplicados en addModule
// (solo se usa m.id); el adapter incluye las filas completas en runtime.
export type CompanyModuleRef = {
  id: string;
};

// Fila + módulos conectados (include { modules: true } lo hace el adapter) —
// byte-idéntico a findOne/findByCuit/addModule de hoy (REQ-C-01).
export type CompanyWithModules = CompanyEntity & {
  modules: CompanyModuleRef[];
};

export type CreateCompanyData = {
  name: string;
  cuit: string;
};

// Campos legacy del controller (nombre/cuit/estado) — se conservan tal cual,
// aunque Prisma los rechace en runtime (REQ-C-01/03, sin corregir lógica).
export type UpdateCompanyData = {
  nombre?: string;
  cuit?: string;
  estado?: string;
};

export interface CompanyRepositoryPort {
  findAll(): Promise<CompanyEntity[]>;
  findById(id: string): Promise<CompanyEntity | null>;
  findByCuit(cuit: string): Promise<CompanyWithModules | null>;
  findByIdWithModules(id: string): Promise<CompanyWithModules | null>;
  create(data: CreateCompanyData): Promise<CompanyEntity>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyEntity>;
  assignModule(companyId: string, moduleId: string): Promise<void>;
}
