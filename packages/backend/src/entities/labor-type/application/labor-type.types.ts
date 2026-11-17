import type { LaborKind } from '../domain/labor-kind';

export type LaborTypeRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  kind: LaborKind;
};

export type CreateLaborTypeInput = {
  name: string;
  description?: string;
  /** Raw from the wire; the use case validates it against the frozen vocabulary. */
  kind?: unknown;
};

export type UpdateLaborTypeInput = {
  name?: string;
  description?: string;
  kind?: unknown;
  taskIds?: string[];
};

export type CreateLaborTypeData = {
  tenantId: string;
  name: string;
  description?: string;
  kind: LaborKind;
};

export type UpdateLaborTypeData = {
  name?: string;
  description?: string;
  kind?: LaborKind;
  taskIds?: string[];
};

export type RemoveLaborTypeOutput = {
  message: string;
};

export type TaskLookupRecord = {
  id: string;
};
