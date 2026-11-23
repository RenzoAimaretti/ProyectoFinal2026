import { ValueMoneyUseCase } from '../../../valuation/application/use-cases/value-money.use-case';
import { ExpenseValuation } from '../../application/dto/expense.output';
import {
  MoneyToValue,
  MoneyValuationPort,
} from '../../application/ports/money-valuation.port';

/**
 * Consumer port of `expense` over the exported `valuation` use case. Unlike
 * the tariff adapter, a missing market value is NOT turned into `null`: the
 * `MarketUnavailableError` propagates so the expense is rejected (D25).
 */
export class ValuationMoneyValuationAdapter implements MoneyValuationPort {
  constructor(private readonly valueMoney: ValueMoneyUseCase) {}

  async valueToArs(money: MoneyToValue): Promise<ExpenseValuation> {
    const valued = await this.valueMoney.execute(money);
    return {
      amountArs: valued.amountArs,
      grainArsPerTon: valued.grainArsPerTon,
      usdRate: valued.usdRate,
      usdRateType: valued.usdRateType,
      // One source per price actually used: the grain board or the USD feed.
      priceSource: valued.grainSource ?? valued.usdSource,
      priceFetchedAt: valued.priceFetchedAt,
      priceStale: valued.priceStale,
    };
  }
}
