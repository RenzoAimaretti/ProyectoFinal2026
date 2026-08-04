// Puerto de capacidad angosto (D1 Option A): solo la lectura de lote+farm que el
// servicio necesita para validar pertenencia a empresa. El adapter de F2/W2 (lot)
// podrá reemplazarlo por LOT_REPOSITORY exportado por el dueño (T-F2-23).

export const LOT_LOOKUP = Symbol('LOT_LOOKUP');

export interface LotLookupPort {
  findLotWithFarm(id: string): Promise<{ id: string; farm: { companyId: string } } | null>;
}
