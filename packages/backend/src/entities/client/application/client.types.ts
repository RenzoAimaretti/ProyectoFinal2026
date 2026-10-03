export type ClientRecord = {
  id: string;
  tenantId: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  userId?: string | null;
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

export type ClientLotRecord = {
  id: string;
  name: string;
  area: number;
  coords: string | null;
};

export type ClientFarmRecord = {
  id: string;
  name: string;
  location: string | null;
  surface: number;
  lots: ClientLotRecord[];
};

export type ClientProfileRecord = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  farms: ClientFarmRecord[];
};

export type CreateClientWithAccessInput = {
  email: string;
  firstName: string;
  lastName: string;
  farmName: string;
  lots: Array<{
    name: string;
    area: number;
    coords?: string | null;
  }>;
  password?: string;
  phone?: string | null;
  address?: string | null;
};

export type CreateClientWithAccessData = {
  tenantId: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  farmName: string;
  lots: Array<{
    name: string;
    area: number;
    coords?: string | null;
  }>;
  passwordHash: string;
  phone: string | null;
  address: string | null;
};

export type ClientAccessResult = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  farms: ClientFarmRecord[];
  lots: ClientLotRecord[];
};

export type UpdateClientProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
};
