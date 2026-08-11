export type WeightRecordRecord = {
  id: string;
  livestockId: string;
  operatorId: string | null;
  weight: number;
  measuredAt: Date;
  createdAt: Date;
};

export type CreateWeightRecordInput = {
  livestockId: string;
  operatorId: string;
  weight: number;
  measuredAt: string;
};

export type UpdateWeightRecordInput = {
  operatorId?: string;
  weight?: number;
  measuredAt?: string;
};

export type CreateWeightRecordData = {
  livestockId: string;
  operatorId: string;
  weight: number;
  measuredAt: Date;
};

export type UpdateWeightRecordData = {
  operatorId?: string;
  weight?: number;
  measuredAt?: Date;
};

export type RemoveWeightRecordOutput = {
  message: string;
};
