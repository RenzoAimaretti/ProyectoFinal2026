import { Dec } from '../../../valuation/domain/decimal';
import { resolveRange } from '../../domain/campaign';
import { totalsOf } from '../../domain/profitability.metrics';
import { parseValuationMode } from '../../domain/valuation-mode';
import {
  LotProfitabilityListOutput,
  LotRowOutput,
} from '../dto/profitability.output';
import { valueAmounts } from '../entry-valuation';
import { ClockPort } from '../ports/clock.port';
import { MarketSnapshotPort } from '../ports/market-snapshot.port';
import { PendingValuationRetryPort } from '../ports/pending-valuation-retry.port';
import {
  ENTRY_KIND,
  ProfitabilityReaderPort,
} from '../ports/profitability-reader.port';
import {
  arsText,
  metricsOutput,
  pendingOutput,
  rangeOutput,
  sum,
  ZERO,
} from '../profitability-output';

export interface GetLotProfitabilityListInput {
  /** From the session token, never from the request. */
  companyId: string;
  tenantId: string;
  campaign?: string;
  from?: string;
  to?: string;
  mode?: string;
}

interface LotAccumulator {
  income: Dec[];
  standardCost: Dec[];
  expenses: Dec[];
}

/**
 * The calculator table: one row per lot with activity of the session company
 * in the range, plus a totals row and the unvalued reports.
 */
export class GetLotProfitabilityListUseCase {
  constructor(
    private readonly reader: ProfitabilityReaderPort,
    private readonly pendingRetry: PendingValuationRetryPort,
    private readonly market: MarketSnapshotPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: GetLotProfitabilityListInput,
  ): Promise<LotProfitabilityListOutput> {
    // Validate before any side effect: a bad filter never triggers a retry.
    const range = resolveRange(
      { campaign: input.campaign, from: input.from, to: input.to },
      this.clock.now(),
    );
    const mode = parseValuationMode(input.mode);

    await this.pendingRetry.retry(input.companyId);

    const activity = await this.reader.findActivity({
      companyId: input.companyId,
      tenantId: input.tenantId,
      range: { from: range.from, to: range.to },
    });

    const valued = await valueAmounts(activity.entries, mode, this.market);

    const byLot = new Map<string, LotAccumulator>();
    activity.entries.forEach((entry, index) => {
      const lot = byLot.get(entry.lotId) ?? {
        income: [],
        standardCost: [],
        expenses: [],
      };
      const ars = valued.ars[index];
      if (entry.kind === ENTRY_KIND.INCOME) lot.income.push(ars);
      else if (entry.kind === ENTRY_KIND.STANDARD_COST)
        lot.standardCost.push(ars);
      else lot.expenses.push(ars);
      byLot.set(entry.lotId, lot);
    });

    const pendingByLot = new Map(
      activity.pending.map((item) => [item.lotId, item]),
    );

    const rows: LotRowOutput[] = [];
    const totalInputs: Array<{ income: Dec; cost: Dec; areaHa: Dec }> = [];

    // D27: a lot is listed only when it has valued reports, expenses or
    // pending reports; the reader's lot list is just the lookup of its data.
    for (const lot of [...activity.lots].sort(byLotName)) {
      const amounts = byLot.get(lot.lotId);
      const pending = pendingByLot.get(lot.lotId);
      if (!amounts && !(pending && pending.reports > 0)) continue;

      const income = sum(amounts?.income ?? []);
      const standardCost = sum(amounts?.standardCost ?? []);
      const expenses = sum(amounts?.expenses ?? []);
      const metrics = metricsOutput({
        areaHa: lot.areaHa,
        income,
        standardCost,
        expenses,
      });

      rows.push({
        lotId: lot.lotId,
        lotName: lot.lotName,
        farmName: lot.farmName,
        clientName: lot.clientName,
        ...metrics,
      });
      totalInputs.push({
        income: income.roundHalfUp(2),
        cost: standardCost.add(expenses).roundHalfUp(2),
        areaHa: lot.areaHa,
      });
    }

    const totals = totalsOf(totalInputs);

    return {
      mode,
      range: rangeOutput(range),
      lots: rows,
      totals: {
        areaHa: totals.areaHa.toString(),
        incomeArs: arsText(totals.income),
        costArs: arsText(totals.cost),
        marginArs: arsText(totals.margin),
        marginPerHaArs: totals.marginPerHa ? arsText(totals.marginPerHa) : null,
        profitability: totals.profitability
          ? totals.profitability.toString()
          : null,
      },
      pending: pendingOutput(
        activity.pending.reduce((count, item) => count + item.reports, 0),
        activity.pending.reduce(
          (total, item) => total.add(item.hectares),
          ZERO,
        ),
      ),
      valuation: valued.valuation,
    };
  }
}

function byLotName(
  a: { lotName: string; lotId: string },
  b: { lotName: string; lotId: string },
): number {
  return a.lotName.localeCompare(b.lotName) || a.lotId.localeCompare(b.lotId);
}
