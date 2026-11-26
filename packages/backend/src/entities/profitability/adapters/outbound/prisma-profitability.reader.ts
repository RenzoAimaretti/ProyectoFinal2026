import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Dec } from '../../../valuation/domain/decimal';
import { Grain, Money, MoneyUnit } from '../../../valuation/domain/money';
import { quantityFromNumber } from '../../../valuation/domain/valuation.rules';
import {
  ActivityQuery,
  DetailExpense,
  DetailReport,
  ENTRY_KIND,
  LotActivity,
  LotDetailData,
  LotDetailQuery,
  LotInfo,
  PendingByLot,
  ProfitEntry,
  ProfitabilityReaderPort,
} from '../../application/ports/profitability-reader.port';
import {
  argentinaDayOf,
  expenseDateBounds,
  reportDateBounds,
} from '../../domain/campaign';

/** Scale of the Decimal(18,4) columns. */
const COLUMN_DECIMALS = 4;

const LOT_SELECT = {
  id: true,
  name: true,
  area: true,
  farm: { select: { name: true, client: { select: { name: true } } } },
} satisfies Prisma.LotSelect;

type LotRow = Prisma.LotGetPayload<{ select: typeof LOT_SELECT }>;

const VALUATION_ENTRY_SELECT = {
  lotId: true,
  priceUnit: true,
  priceGrain: true,
  incomeNative: true,
  incomeArs: true,
  costUnit: true,
  costGrain: true,
  costNative: true,
  costArs: true,
} satisfies Prisma.DailyReportValuationSelect;

const EXPENSE_ENTRY_SELECT = {
  lotId: true,
  unit: true,
  grain: true,
  amount: true,
  amountArs: true,
} satisfies Prisma.ExpenseSelect;

const VALUATION_DETAIL_SELECT = {
  dailyReportId: true,
  hectares: true,
  hours: true,
  priceAmount: true,
  priceUnit: true,
  priceGrain: true,
  priceBasis: true,
  costAmount: true,
  costUnit: true,
  costGrain: true,
  costBasis: true,
  incomeNative: true,
  incomeArs: true,
  costNative: true,
  costArs: true,
  priceStale: true,
  priceFetchedAt: true,
  valuedAt: true,
  origin: true,
  dailyReport: {
    select: { date: true, laborType: { select: { name: true } } },
  },
} satisfies Prisma.DailyReportValuationSelect;

const EXPENSE_DETAIL_SELECT = {
  id: true,
  date: true,
  description: true,
  categoryId: true,
  category: { select: { name: true } },
  unit: true,
  grain: true,
  amount: true,
  amountArs: true,
  priceStale: true,
  priceFetchedAt: true,
  valuedAt: true,
} satisfies Prisma.ExpenseSelect;

/**
 * Every read of company data is filtered by the session `companyId` (R033);
 * lots are looked up only through the tenant chain lot -> farm -> client, so
 * nothing of another company or tenant can reach the use case. Reports are
 * bounded in Argentine time and expenses (stored at UTC midnight) by whole
 * UTC days; deleted expenses never count.
 */
@Injectable()
export class PrismaProfitabilityReader implements ProfitabilityReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActivity(query: ActivityQuery): Promise<LotActivity> {
    const reportDate = reportDateBounds(query.range);
    const expenseDate = expenseDateBounds(query.range);

    const [valuations, expenses, pendingGroups] = await Promise.all([
      this.prisma.dailyReportValuation.findMany({
        where: {
          companyId: query.companyId,
          dailyReport: { date: reportDate },
        },
        select: VALUATION_ENTRY_SELECT,
      }),
      this.prisma.expense.findMany({
        where: {
          companyId: query.companyId,
          deletedAt: null,
          date: expenseDate,
        },
        select: EXPENSE_ENTRY_SELECT,
      }),
      this.prisma.dailyReport.groupBy({
        by: ['lotId'],
        where: {
          companyId: query.companyId,
          status: 'APROBADO',
          valuation: { is: null },
          date: reportDate,
        },
        _count: { _all: true },
        _sum: { hectares: true },
      }),
    ]);

    const entries: ProfitEntry[] = [
      ...valuations.flatMap((row): ProfitEntry[] => [
        {
          lotId: row.lotId,
          kind: ENTRY_KIND.INCOME,
          native: money(row.incomeNative, row.priceUnit, row.priceGrain),
          arsAtApproval: decimal(row.incomeArs),
        },
        {
          lotId: row.lotId,
          kind: ENTRY_KIND.STANDARD_COST,
          native: money(row.costNative, row.costUnit, row.costGrain),
          arsAtApproval: decimal(row.costArs),
        },
      ]),
      ...expenses.map(
        (row): ProfitEntry => ({
          lotId: row.lotId,
          kind: ENTRY_KIND.EXPENSE,
          native: money(row.amount, row.unit, row.grain),
          arsAtApproval: decimal(row.amountArs),
        }),
      ),
    ];

    const pending: PendingByLot[] = pendingGroups.map((group) => ({
      lotId: group.lotId,
      reports: group._count._all,
      hectares: quantityFromNumber(group._sum.hectares ?? 0),
    }));

    const lotIds = [
      ...new Set([
        ...entries.map((entry) => entry.lotId),
        ...pending.map((item) => item.lotId),
      ]),
    ];
    if (lotIds.length === 0) return { lots: [], entries, pending };

    const lots = await this.prisma.lot.findMany({
      where: {
        id: { in: lotIds },
        farm: { client: { tenantId: query.tenantId } },
      },
      select: LOT_SELECT,
    });

    return { lots: lots.map(toLotInfo), entries, pending };
  }

  async findLotDetail(query: LotDetailQuery): Promise<LotDetailData | null> {
    const lot = await this.prisma.lot.findFirst({
      where: {
        id: query.lotId,
        farm: { client: { tenantId: query.tenantId } },
      },
      select: LOT_SELECT,
    });
    if (!lot) return null;

    const reportDate = reportDateBounds(query.range);
    const expenseDate = expenseDateBounds(query.range);

    const [valuations, expenses, pending] = await Promise.all([
      this.prisma.dailyReportValuation.findMany({
        where: {
          companyId: query.companyId,
          lotId: query.lotId,
          dailyReport: { date: reportDate },
        },
        orderBy: [{ dailyReport: { date: 'asc' } }, { dailyReportId: 'asc' }],
        select: VALUATION_DETAIL_SELECT,
      }),
      this.prisma.expense.findMany({
        where: {
          companyId: query.companyId,
          lotId: query.lotId,
          deletedAt: null,
          date: expenseDate,
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        select: EXPENSE_DETAIL_SELECT,
      }),
      this.prisma.dailyReport.aggregate({
        where: {
          companyId: query.companyId,
          lotId: query.lotId,
          status: 'APROBADO',
          valuation: { is: null },
          date: reportDate,
        },
        _count: { _all: true },
        _sum: { hectares: true },
      }),
    ]);

    return {
      lot: toLotInfo(lot),
      reports: valuations.map(
        (row): DetailReport => ({
          reportId: row.dailyReportId,
          date: argentinaDayOf(row.dailyReport.date),
          laborName: row.dailyReport.laborType.name,
          hectares: decimal(row.hectares),
          hours: decimal(row.hours),
          price: {
            amount: decimal(row.priceAmount),
            unit: row.priceUnit,
            grain: row.priceGrain,
            basis: row.priceBasis,
          },
          cost: {
            amount: decimal(row.costAmount),
            unit: row.costUnit,
            grain: row.costGrain,
            basis: row.costBasis,
          },
          income: money(row.incomeNative, row.priceUnit, row.priceGrain),
          incomeAtApproval: decimal(row.incomeArs),
          standardCost: money(row.costNative, row.costUnit, row.costGrain),
          standardCostAtApproval: decimal(row.costArs),
          priceStale: row.priceStale,
          priceFetchedAt: row.priceFetchedAt,
          valuedAt: row.valuedAt,
          lateValuation: row.origin === 'REINTENTO',
        }),
      ),
      expenses: expenses.map(
        (row): DetailExpense => ({
          expenseId: row.id,
          date: row.date.toISOString().slice(0, 10),
          description: row.description,
          categoryId: row.categoryId,
          categoryName: row.category.name,
          native: money(row.amount, row.unit, row.grain),
          arsAtApproval: decimal(row.amountArs),
          priceStale: row.priceStale,
          priceFetchedAt: row.priceFetchedAt,
          valuedAt: row.valuedAt,
        }),
      ),
      pending: {
        reports: pending._count._all,
        hectares: quantityFromNumber(pending._sum.hectares ?? 0),
      },
    };
  }
}

type Decimalish = { toFixed(decimals: number): string };

function decimal(value: Decimalish): Dec {
  return Dec.parse(value.toFixed(COLUMN_DECIMALS));
}

function money(
  amount: Decimalish,
  unit: MoneyUnit,
  grain: Grain | null,
): Money {
  return { amount: decimal(amount), unit, grain };
}

function toLotInfo(row: LotRow): LotInfo {
  return {
    lotId: row.id,
    lotName: row.name,
    farmName: row.farm.name,
    clientName: row.farm.client.name,
    // Lot.area is a Float column: exact conversion through its decimal string.
    areaHa: quantityFromNumber(row.area),
  };
}
