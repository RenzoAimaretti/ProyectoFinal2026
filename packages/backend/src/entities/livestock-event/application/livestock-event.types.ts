export type LivestockEventType =
  | 'VACUNACION'
  | 'TRATAMIENTO'
  | 'CASTRACION'
  | 'INSEMINACION'
  | 'PARTO'
  | 'ENFERMEDAD';

export type LivestockEventRecord = {
  id: string;
  livestockId: string;
  operatorId: string | null;
  type: LivestockEventType;
  observations: string | null;
  vaccine: string | null;
  dose: number | null;
  eventDate: Date;
  createdAt: Date;
};

export type CreateLivestockEventInput = {
  eventDate: string;
  eventType: LivestockEventType;
  livestockId: string;
  operatorId: string;
  obs?: string;
  vaccine?: string | null;
  dose?: number | null;
};

export type UpdateLivestockEventInput = {
  eventDate?: string;
  eventType?: LivestockEventType;
  livestockId?: string;
  operatorId?: string;
  obs?: string;
  vaccine?: string | null;
  dose?: number | null;
};

export type CreateLivestockEventData = {
  eventDate: Date;
  eventType: LivestockEventType;
  livestockId: string;
  operatorId: string;
  obs?: string;
  vaccine?: string | null;
  dose?: number | null;
};

export type UpdateLivestockEventData = {
  eventDate?: Date;
  eventType?: LivestockEventType;
  livestockId?: string;
  operatorId?: string;
  obs?: string;
  vaccine?: string | null;
  dose?: number | null;
};
