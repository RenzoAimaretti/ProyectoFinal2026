import { Dec } from '../../../valuation/domain/decimal';
import { TARIFF_BASIS } from '../../../valuation/domain/money';
import { resolveRange } from '../../domain/campaign';
import { EntityNotFoundError } from '../../domain/errors';
import { parseValuationMode } from '../../domain/valuation-mode';
import {
  DetailExpenseOutput,
  DetailReportOutput,
  ExpenseCategoryGroupOutput,
  LotProfitabilityDetailOutput,
  TariffComponentOutput,
} from '../dto/profitability.output';
import { valueAmounts } from '../entry-valuation';
import { ClockPort } from '../ports/clock.port';
import { MarketSnapshotPort } from '../ports/market-snapshot.port';
import {
  ProfitabilityReaderPort,
  TariffComponent,
} from '../ports/profitability-reader.port';
import {
  arsText,
  metricsOutput,
  moneyAmountText,
  pendingOutput,
  quantityText,
  rangeOutput,
  sum,
} from '../profitability-output';

export interface GetLotProfitabilityDetailInput {
  /** From the session token, never from the request. */
  companyId: string;
  tenantId: string;
  lotId: string;
  campaign?: string;
  from?: string;
  to?: string;
  mode?: string;
}

/**
 * The detail drawer of one lot: valued reports, expenses by category and the
 * unvalued reports, for the same range and mode as the list.
 */
export class GetLotProfitabilityDetailUseCase {
  constructor(
    private readonly reader: ProfitabilityReaderPort,
    private readonly market: MarketSnapshotPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: GetLotProfitabilityDetailInput,
  ): Promise<LotProfitabilityDetailOutput> {
    const range = resolveRange(
      { campaign: input.campaign, from: input.from, to: input.to },
      this.clock.now(),
    );
    const mode = parseValuationMode(input.mode);

    const detail = await this.reader.findLotDetail({
      companyId: input.companyId,
      tenantId: input.tenantId,
      lotId: input.lotId,
      range: { from: range.from, to: range.to },
    });
    if (!detail) throw new EntityNotFoundError('Lote no encontrado');

    // One flat list, valued in one call (one market photo), read back by index.
    const valued = await valueAmounts(
      [
        ...detail.reports.flatMap((report) => [
          { native: report.income, arsAtApproval: report.incomeAtApproval },
          {
            native: report.standardCost,
            arsAtApproval: report.standardCostAtApproval,
          },
        ]),
        ...detail.expenses.map((expense) => ({
          native: expense.native,
          arsAtApproval: expense.arsAtApproval,
        })),
      ],
      mode,
      this.market,
    );

    const reports: DetailReportOutput[] = detail.reports.map(
      (report, index) => {
        const quantity =
          report.price.basis === TARIFF_BASIS.POR_HECTAREA
            ? report.hectares
            : report.hours;
        return {
          reportId: report.reportId,
          date: report.date,
          laborName: report.laborName,
          quantity: quantityText(quantity),
          hectares: quantityText(report.hectares),
          hours: quantityText(report.hours),
          price: tariffOutput(report.price),
          cost: tariffOutput(report.cost),
          incomeNative: moneyAmountText(report.income),
          incomeArs: arsText(valued.ars[index * 2]),
          standardCostNative: moneyAmountText(report.standardCost),
          standardCostArs: arsText(valued.ars[index * 2 + 1]),
        };
      },
    );

    const expenseOffset = detail.reports.length * 2;
    const expenseArs = detail.expenses.map(
      (_, index) => valued.ars[expenseOffset + index],
    );

    const groups = new Map<
      string,
      { name: string; items: Array<{ output: DetailExpenseOutput; ars: Dec }> }
    >();
    detail.expenses.forEach((expense, index) => {
      const group = groups.get(expense.categoryId) ?? {
        name: expense.categoryName,
        items: [],
      };
      group.items.push({
        ars: expenseArs[index],
        output: {
          expenseId: expense.expenseId,
          date: expense.date,
          description: expense.description,
          amount: moneyAmountText(expense.native),
          unit: expense.native.unit,
          grain: expense.native.grain,
          amountArs: arsText(expenseArs[index]),
        },
      });
      groups.set(expense.categoryId, group);
    });

    const expensesByCategory: ExpenseCategoryGroupOutput[] = [...groups]
      .map(([categoryId, group]) => ({
        categoryId,
        categoryName: group.name,
        subtotalArs: arsText(sum(group.items.map((item) => item.ars))),
        expenses: group.items
          .sort(
            (a, b) =>
              a.output.date.localeCompare(b.output.date) ||
              a.output.expenseId.localeCompare(b.output.expenseId),
          )
          .map((item) => item.output),
      }))
      .sort(
        (a, b) =>
          a.categoryName.localeCompare(b.categoryName) ||
          a.categoryId.localeCompare(b.categoryId),
      );

    return {
      mode,
      range: rangeOutput(range),
      lot: {
        lotId: detail.lot.lotId,
        lotName: detail.lot.lotName,
        farmName: detail.lot.farmName,
        clientName: detail.lot.clientName,
        areaHa: detail.lot.areaHa.roundHalfUp(4).toString(),
      },
      summary: metricsOutput({
        areaHa: detail.lot.areaHa,
        income: sum(detail.reports.map((_, i) => valued.ars[i * 2])),
        standardCost: sum(detail.reports.map((_, i) => valued.ars[i * 2 + 1])),
        expenses: sum(expenseArs),
      }),
      reports,
      expensesByCategory,
      pending: pendingOutput(detail.pending.reports, detail.pending.hectares),
      valuation: valued.valuation,
    };
  }
}

function tariffOutput(component: TariffComponent): TariffComponentOutput {
  return {
    amount: quantityText(component.amount),
    unit: component.unit,
    grain: component.grain,
    basis: component.basis,
  };
}
