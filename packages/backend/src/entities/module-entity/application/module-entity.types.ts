export type ModuleEntityRecord = {
  id: string;
  name: string;
  price: number;
  version: string;
  createdAt: Date;
};

export type CreateModuleEntityInput = {
  name: string;
  price: number;
  version: string;
};

export type UpdateModuleEntityInput = {
  name: string;
  price: number;
  version: string;
};
