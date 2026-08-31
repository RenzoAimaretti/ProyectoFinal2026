export type LotRecord = {
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

export type CreateLotInput = {
  name: string;
  farmId: string;
  coords: string;
  area: number;
  companyId?: string;
};

export type UpdateLotInput = {
  name?: string;
  farmId?: string;
  coords?: string;
  area?: number;
  active?: boolean;
  companyId?: string;
};
