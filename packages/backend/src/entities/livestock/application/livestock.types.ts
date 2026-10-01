import { LivestockStatus } from '../domain/livestock-status';

export type LivestockRecord = {
  id: string;
  companyId: string;
  lotId: string | null;
  tagNumber: string;
  species: string;
  breed: string | null;
  sex: string;
  birthDate: Date | null;
  status: LivestockStatus;
  entryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateLivestockInput = {
  companyId?: string;
  lotId?: string | null;
  tagNumber: string;
  breed?: string | null;
  species: string;
  birthDate?: string | Date | null;
  sex: string;
};

export type UpdateLivestockInput = {
  companyId?: string;
  lotId?: string | null;
  tagNumber?: string;
  breed?: string | null;
  species?: string;
  birthDate?: string | Date | null;
  sex?: string;
  status?: LivestockStatus;
};

export type RemoveLivestockOutput = {
  message: string;
};
