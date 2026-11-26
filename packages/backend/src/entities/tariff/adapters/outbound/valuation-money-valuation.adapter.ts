import { ValueMoneyUseCase } from '../../../valuation/application/use-cases/value-money.use-case';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import {
  ArsValuation,
  MoneyToValue,
  MoneyValuationPort,
} from '../../application/ports/money-valuation.port';

/**
 * Puerto consumidor de `tariff` sobre el caso de uso exportado de `valuation`
 * (mismo patron que T4: puerto propio + adapter). Un dato de mercado faltante
 * se traduce a `null`; el resto de los errores se propaga.
 */
export class ValuationMoneyValuationAdapter implements MoneyValuationPort {
  constructor(private readonly valueMoney: ValueMoneyUseCase) {}

  async valueToArs(money: MoneyToValue): Promise<ArsValuation | null> {
    try {
      const valued = await this.valueMoney.execute(money);
      return {
        amountArs: valued.amountArs,
        grainArsPerTon: valued.grainArsPerTon,
      };
    } catch (error) {
      if (error instanceof MarketUnavailableError) return null;
      throw error;
    }
  }
}
