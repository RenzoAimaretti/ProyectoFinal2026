export type FarmRecord = {
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

export type CreateFarmInput = {
  name: string;
  location: string;
  companyId: string;
  surface: number;
};

export type UpdateFarmInput = {
  name?: string;
  location?: string;
  companyId?: string;
  surface?: number;
};
