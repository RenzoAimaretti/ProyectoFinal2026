export type LivestockMovementRecord = {
  id: string;
  livestockId: string;
  lotId: string;
  movementDate: Date;
  observations: string | null;
  createdAt: Date;
};

export type CreateLivestockMovementInput = {
  livestockId: string;
  lotId: string;
  movementDate: string;
  observations?: string;
  companyId?: string;
};

export type CreateLivestockMovementData = {
  livestockId: string;
  lotId: string;
  movementDate: Date;
  observations?: string;
};
