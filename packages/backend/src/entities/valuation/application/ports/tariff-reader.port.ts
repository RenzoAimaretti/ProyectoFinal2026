import { ValuationTariff } from '../../domain/valuation.rules';

export const TARIFF_READER = Symbol('VALUATION_TARIFF_READER');

export interface TariffReaderPort {
  /** Tariff of the company + labor pair, or `null` when there is none. */
  findByPair(
    companyId: string,
    laborTypeId: string,
  ): Promise<ValuationTariff | null>;
}
