import { ReceptionStatus } from '../domain/reception-status';

export type ReceptionItemRecord = {
  id: string;
  receptionId: string;
  inputId: string;
  /** Expected quantity declared by the client when the reception was created. */
  quantity: number;
  /** Quantity agreed by the administrator; null while the reception is pending. */
  validatedQuantity: number | null;
  /** R015 shortage (negative) or surplus (positive); null while pending. */
  quantityVariance: number | null;
  /**
   * Additive read enrichment: shortage or surplus of the item, present only
   * once the reception has an agreed quantity. It mirrors `quantityVariance`
   * and is exposed so the UI can render the label without guessing the rule.
   */
  variance?: number;
  /** Additive read enrichment: catalogue name of the input. */
  inputName?: string;
  unit: string;
};

export type ReceptionPhotoRecord = {
  id: string;
  /** Public path the photo is served from; the client prefixes the API base. */
  url: string;
  orderIndex: number;
};

export type ReceptionRecord = {
  id: string;
  clientId: string;
  date: Date;
  status: ReceptionStatus;
  rejectionReason: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Additive read enrichment: name of the client that owns the reception. */
  clientName?: string;
  /**
   * Additive read enrichment: photos attached to the reception, ordered by
   * their stored position. It is empty when the reception has no photo.
   */
  photos?: ReceptionPhotoRecord[];
  items: ReceptionItemRecord[];
};

export type CreateReceptionItemInput = {
  inputId: string;
  quantity: number;
};

/**
 * The client is not part of the input: it is the scope the use case receives
 * from the caller. The status is not part of the input either, so no caller can
 * create an already validated reception. Units are resolved from the input
 * catalogue to keep a single unit per `{ clientId, inputId }` stock balance.
 */
export type CreateReceptionInput = {
  date: string;
  items: CreateReceptionItemInput[];
};

export type CreateReceptionItemData = {
  inputId: string;
  quantity: number;
  unit: string;
};

export type CreateReceptionData = {
  clientId: string;
  date: Date;
  status: ReceptionStatus;
  items: CreateReceptionItemData[];
};

/**
 * The validated quantity agreed by the administrator for one item of a
 * reception (R014). It is always strictly positive and finite, and it is what
 * enters the client stock instead of the expected quantity.
 */
export type ReceptionItemValidation = {
  inputId: string;
  validatedQuantity: number;
};

/**
 * Validation approves the quantities agreed with the client (R014) and enters
 * exactly those quantities in the stock (R017/CUU07). The expected quantities
 * are not part of the input: they stay stored on the reception so the shortage
 * or surplus of each item remains observable as validated minus expected
 * (R015).
 */
export type ValidateReceptionData = {
  id: string;
  clientId: string;
  validatedBy: string;
  validatedAt: Date;
  items: ReceptionItemValidation[];
};

export type RejectReceptionData = {
  id: string;
  clientId: string;
  rejectionReason: string;
};
