export type ClientRecord = {
  id: string;
  tenantId: string;
  name: string;
  cuit: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateClientInput = {
  name: string;
  cuit?: string;
};

export type CreateClientData = {
  tenantId: string;
  name: string;
  cuit?: string;
};

export type UpdateClientInput = {
  name?: string;
  cuit?: string;
  active?: boolean;
};
