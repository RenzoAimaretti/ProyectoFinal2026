export type CompanyModuleRecord = {
  id: string;
  name: string;
  price: number;
  version: string;
  createdAt: Date;
};

export type CompanyRecord = {
  id: string;
  name: string;
  cuit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CompanyWithModules = CompanyRecord & {
  modules: CompanyModuleRecord[];
};

export type CreateCompanyInput = {
  name: string;
  cuit: string;
};

export type UpdateCompanyInput = {
  name?: string;
  cuit?: string;
  active?: boolean;
};

export type AddCompanyModuleInput = {
  companyId: string;
  moduleId: string;
};
