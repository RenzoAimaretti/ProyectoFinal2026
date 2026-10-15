import { UsdRateSnapshot } from '../domain/exchange-rate.types';

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');

export interface ExchangeRateProviderPort {
  fetchOfficialUsd(): Promise<UsdRateSnapshot>;
}
