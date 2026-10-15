import { PizarraSnapshot } from '../domain/grain-price.types';

export const GRAIN_PRICE_PROVIDER = Symbol('GRAIN_PRICE_PROVIDER');

export interface GrainPriceProviderPort {
  fetchPizarra(): Promise<PizarraSnapshot>;
}
