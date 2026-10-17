import type { GeoJsonPolygon } from '../domain/lot-polygon';
import type { LotState } from '../domain/lot-state';

export type LotRecord = {
  id: string;
  farmId: string;
  name: string;
  /** Legacy display text in DMS. Deprecated, never removed: the mobile drift table persists it. */
  coords: string | null;
  polygon: GeoJsonPolygon | null;
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
  /** Optional: CUU02 keeps creating a lot and delimiting it as separate moments. */
  coords?: string;
  /**
   * Raw GeoJSON as it arrives from the wire. The use case validates it through
   * `LotPolygon` before any adapter sees it, so what reaches the repository is
   * always a polygon that satisfies S9.
   */
  polygon?: unknown;
  area: number;
  companyId?: string;
};

export type UpdateLotInput = {
  name?: string;
  farmId?: string;
  coords?: string;
  polygon?: unknown;
  area?: number;
  active?: boolean;
  companyId?: string;
};

/** A read projection. The state is derived from history, never stored. */
export type LotWithState = LotRecord & { state: LotState };
