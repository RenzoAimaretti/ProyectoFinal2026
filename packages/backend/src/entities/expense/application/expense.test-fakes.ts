import { Dec } from '../../valuation/domain/decimal';
import { MarketUnavailableError } from '../../valuation/domain/errors';
import {
  EntityNotFoundError,
  ConcurrentModificationError,
} from '../domain/errors';
import {
  ExpenseFilters,
  assertNoPendingSuggestion,
  assertPendingSuggestion,
} from '../domain/expense.rules';
import {
  ExpenseOutput,
  ExpenseSuggestionOutput,
  ExpenseValuation,
} from './dto/expense.output';
import { ClockPort } from './ports/clock.port';
import { ExpenseCategoryReaderPort } from './ports/expense-category-reader.port';
import {
  CreateExpenseRecord,
  DeleteExpenseRecord,
  ExpenseRepositoryPort,
  UpdateExpenseRecord,
} from './ports/expense-repository.port';
import {
  ApproveSuggestionRecord,
  CreateSuggestionRecord,
  ExpenseSuggestionRepositoryPort,
  RejectSuggestionRecord,
  SuggestionFilter,
} from './ports/expense-suggestion-repository.port';
import { LotReaderPort } from './ports/lot-reader.port';
import { MoneyToValue, MoneyValuationPort } from './ports/money-valuation.port';

function rejectWith(error: unknown): Promise<never> {
  return Promise.reject(
    error instanceof Error ? error : new Error(String(error)),
  );
}

/** Fakes in-memory compartidos por los specs de los casos de uso de expense. */
export const NOW = new Date('2026-11-23T12:00:00Z');

export class FixedClock implements ClockPort {
  constructor(public current: Date = NOW) {}
  now(): Date {
    return this.current;
  }
}

/** Maiz a 195000 ARS/t y USD a 1000 ARS: deterministico. */
export class FakeValuation implements MoneyValuationPort {
  readonly calls: MoneyToValue[] = [];
  unavailable = false;

  valueToArs(money: MoneyToValue): Promise<ExpenseValuation> {
    this.calls.push(money);
    if (this.unavailable) {
      return Promise.reject(new MarketUnavailableError('sin precio'));
    }
    const amount = Dec.parse(money.amount);
    if (money.unit === 'KG_CEREAL') {
      const perTon = Dec.parse('195000');
      return Promise.resolve({
        amountArs: amount
          .mul(perTon)
          .mul(Dec.parse('0.001'))
          .roundHalfUp(2)
          .toString(),
        grainArsPerTon: '195000',
        usdRate: null,
        usdRateType: null,
        priceSource: 'cac.bcr.com.ar',
        priceFetchedAt: NOW,
        priceStale: false,
      });
    }
    if (money.unit === 'USD') {
      return Promise.resolve({
        amountArs: amount.mul(Dec.parse('1000')).roundHalfUp(2).toString(),
        grainArsPerTon: null,
        usdRate: '1000',
        usdRateType: 'OFICIAL_VENTA',
        priceSource: 'dolarapi.com',
        priceFetchedAt: NOW,
        priceStale: false,
      });
    }
    return Promise.resolve({
      amountArs: amount.roundHalfUp(2).toString(),
      grainArsPerTon: null,
      usdRate: null,
      usdRateType: null,
      priceSource: null,
      priceFetchedAt: null,
      priceStale: false,
    });
  }
}

export class FakeLotReader implements LotReaderPort {
  /** lotId -> tenantId */
  readonly lots = new Map<string, string>([
    ['lot-1', 'tenant-1'],
    ['lot-2', 'tenant-1'],
  ]);
  findInTenant(lotId: string, tenantId: string) {
    return Promise.resolve(
      this.lots.get(lotId) === tenantId ? { id: lotId } : null,
    );
  }
}

export class FakeCategoryReader implements ExpenseCategoryReaderPort {
  readonly categories = new Map<string, { tenantId: string; active: boolean }>([
    ['cat-1', { tenantId: 'tenant-1', active: true }],
    ['cat-2', { tenantId: 'tenant-1', active: true }],
    ['cat-off', { tenantId: 'tenant-1', active: false }],
    ['cat-other', { tenantId: 'tenant-2', active: true }],
  ]);
  findInTenant(id: string, tenantId: string) {
    const found = this.categories.get(id);
    return Promise.resolve(
      found && found.tenantId === tenantId
        ? { id, active: found.active }
        : null,
    );
  }
}

/** Gasto + sugerencias en memoria, con las mismas reglas que el adaptador Prisma. */
export class InMemoryExpenses implements ExpenseRepositoryPort {
  readonly expenses = new Map<string, ExpenseOutput>();
  readonly deleted = new Map<string, { at: Date; by: string }>();
  readonly suggestions = new Map<string, ExpenseSuggestionOutput>();
  private sequence = 0;

  seed(overrides: Partial<ExpenseOutput> = {}): ExpenseOutput {
    const id = overrides.id ?? `exp-${++this.sequence}`;
    const expense: ExpenseOutput = {
      id,
      companyId: 'company-1',
      lotId: 'lot-1',
      categoryId: 'cat-1',
      date: new Date('2026-11-20T00:00:00Z'),
      description: 'Flete',
      amount: '90000.0000',
      unit: 'ARS',
      grain: null,
      grainArsPerTon: null,
      usdRate: null,
      usdRateType: null,
      priceSource: null,
      priceFetchedAt: null,
      priceStale: false,
      amountArs: '90000.0000',
      valuedAt: new Date('2026-11-20T10:00:00Z'),
      createdBy: 'sup-1',
      updatedBy: 'sup-1',
      createdAt: new Date('2026-11-20T10:00:00Z'),
      updatedAt: new Date('2026-11-20T10:00:00Z'),
      pendingSuggestionId: null,
      ...overrides,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  private liveExpense(
    id: string,
    companyId: string,
  ): ExpenseOutput | undefined {
    const e = this.expenses.get(id);
    return e && e.companyId === companyId && !this.deleted.has(id)
      ? e
      : undefined;
  }

  private pendingOf(expenseId: string): ExpenseSuggestionOutput | undefined {
    return [...this.suggestions.values()].find(
      (s) => s.expenseId === expenseId && s.status === 'PENDIENTE',
    );
  }

  create(record: CreateExpenseRecord): Promise<ExpenseOutput> {
    const expense = this.seed({
      companyId: record.companyId,
      lotId: record.lotId,
      categoryId: record.categoryId,
      date: record.date,
      description: record.description,
      amount: record.money.amount.toString(),
      unit: record.money.unit,
      grain: record.money.grain,
      grainArsPerTon: record.valuation.grainArsPerTon,
      usdRate: record.valuation.usdRate,
      usdRateType: record.valuation.usdRateType,
      priceSource: record.valuation.priceSource,
      priceFetchedAt: record.valuation.priceFetchedAt,
      priceStale: record.valuation.priceStale,
      amountArs: record.valuation.amountArs,
      valuedAt: record.valuedAt,
      createdBy: record.userId,
      updatedBy: record.userId,
    });
    return Promise.resolve(expense);
  }

  findAll(
    companyId: string,
    filters: ExpenseFilters,
  ): Promise<ExpenseOutput[]> {
    return Promise.resolve(
      [...this.expenses.values()].filter(
        (e) =>
          e.companyId === companyId &&
          !this.deleted.has(e.id) &&
          (!filters.lotId || e.lotId === filters.lotId) &&
          (!filters.categoryId || e.categoryId === filters.categoryId) &&
          (!filters.from || e.date >= filters.from) &&
          (!filters.to || e.date <= filters.to),
      ),
    );
  }

  findById(id: string, companyId: string): Promise<ExpenseOutput | null> {
    const e = this.liveExpense(id, companyId);
    return Promise.resolve(
      e ? { ...e, pendingSuggestionId: this.pendingOf(id)?.id ?? null } : null,
    );
  }

  updateDirect(record: UpdateExpenseRecord): Promise<ExpenseOutput> {
    const current = this.liveExpense(record.id, record.companyId);
    if (!current)
      return Promise.reject(new EntityNotFoundError('Expense not found'));
    if (current.updatedAt.getTime() !== record.expectedUpdatedAt.getTime()) {
      return Promise.reject(new ConcurrentModificationError('stale'));
    }
    try {
      assertNoPendingSuggestion(this.pendingOf(record.id) !== undefined);
    } catch (error) {
      return rejectWith(error);
    }
    return Promise.resolve(this.applyValues(current, record, record.userId));
  }

  softDelete(record: DeleteExpenseRecord): Promise<void> {
    const current = this.liveExpense(record.id, record.companyId);
    if (!current)
      return Promise.reject(new EntityNotFoundError('Expense not found'));
    try {
      assertNoPendingSuggestion(this.pendingOf(record.id) !== undefined);
    } catch (error) {
      return rejectWith(error);
    }
    this.deleted.set(record.id, { at: record.deletedAt, by: record.userId });
    return Promise.resolve();
  }

  private applyValues(
    current: ExpenseOutput,
    values: Pick<
      UpdateExpenseRecord,
      'lotId' | 'categoryId' | 'date' | 'description' | 'revaluation'
    >,
    userId: string,
  ): ExpenseOutput {
    const next: ExpenseOutput = {
      ...current,
      lotId: values.lotId,
      categoryId: values.categoryId,
      date: values.date,
      description: values.description,
      updatedBy: userId,
      updatedAt: new Date(current.updatedAt.getTime() + 1000),
    };
    if (values.revaluation) {
      const { money, valuation, valuedAt } = values.revaluation;
      Object.assign(next, {
        amount: money.amount.toString(),
        unit: money.unit,
        grain: money.grain,
        grainArsPerTon: valuation.grainArsPerTon,
        usdRate: valuation.usdRate,
        usdRateType: valuation.usdRateType,
        priceSource: valuation.priceSource,
        priceFetchedAt: valuation.priceFetchedAt,
        priceStale: valuation.priceStale,
        amountArs: valuation.amountArs,
        valuedAt,
      });
    }
    this.expenses.set(current.id, next);
    return next;
  }

  // --- suggestions ------------------------------------------------------

  private summaryOf(expense: ExpenseOutput) {
    return {
      id: expense.id,
      lotId: expense.lotId,
      categoryId: expense.categoryId,
      date: expense.date,
      description: expense.description,
      amount: expense.amount,
      unit: expense.unit,
      grain: expense.grain,
      amountArs: expense.amountArs,
      deleted: this.deleted.has(expense.id),
    };
  }

  createSuggestion(
    record: CreateSuggestionRecord,
  ): Promise<ExpenseSuggestionOutput> {
    const expense = this.liveExpense(record.expenseId, record.companyId);
    if (!expense)
      return Promise.reject(new EntityNotFoundError('Expense not found'));
    try {
      assertNoPendingSuggestion(this.pendingOf(record.expenseId) !== undefined);
    } catch (error) {
      return rejectWith(error);
    }
    const p = record.proposed;
    const suggestion: ExpenseSuggestionOutput = {
      id: `sug-${++this.sequence}`,
      expenseId: record.expenseId,
      companyId: record.companyId,
      kind: record.kind,
      status: 'PENDIENTE',
      proposed: {
        lotId: p?.lotId ?? null,
        categoryId: p?.categoryId ?? null,
        date: p?.date ?? null,
        description: p?.description ?? null,
        amount: p?.amount ? p.amount.toString() : null,
        unit: p?.unit ?? null,
        grain: p?.grain ?? null,
      },
      suggestedBy: record.suggestedBy,
      rejectionReason: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: NOW,
      expense: this.summaryOf(expense),
    };
    this.suggestions.set(suggestion.id, suggestion);
    return Promise.resolve(suggestion);
  }

  findAllSuggestions(
    filter: SuggestionFilter,
  ): Promise<ExpenseSuggestionOutput[]> {
    return Promise.resolve(
      [...this.suggestions.values()].filter(
        (s) =>
          s.companyId === filter.companyId &&
          (!filter.status || s.status === filter.status) &&
          (!filter.suggestedBy || s.suggestedBy === filter.suggestedBy),
      ),
    );
  }

  findSuggestionById(
    id: string,
    companyId: string,
  ): Promise<ExpenseSuggestionOutput | null> {
    const s = this.suggestions.get(id);
    return Promise.resolve(s && s.companyId === companyId ? s : null);
  }

  approveSuggestion(
    record: ApproveSuggestionRecord,
  ): Promise<ExpenseSuggestionOutput> {
    const s = this.suggestions.get(record.id);
    if (!s || s.companyId !== record.companyId) {
      return Promise.reject(new EntityNotFoundError('Suggestion not found'));
    }
    try {
      assertPendingSuggestion(s.status);
    } catch (error) {
      return rejectWith(error);
    }
    const expense = this.liveExpense(s.expenseId, record.companyId);
    if (!expense)
      return Promise.reject(new EntityNotFoundError('Expense not found'));

    if (record.apply.kind === 'BAJA') {
      this.deleted.set(expense.id, {
        at: record.resolvedAt,
        by: record.resolvedBy,
      });
    } else {
      this.applyValues(expense, record.apply, record.resolvedBy);
    }
    const resolved: ExpenseSuggestionOutput = {
      ...s,
      status: 'APROBADA',
      resolvedBy: record.resolvedBy,
      resolvedAt: record.resolvedAt,
      expense: this.summaryOf(this.expenses.get(expense.id)!),
    };
    this.suggestions.set(s.id, resolved);
    return Promise.resolve(resolved);
  }

  rejectSuggestion(
    record: RejectSuggestionRecord,
  ): Promise<ExpenseSuggestionOutput> {
    const s = this.suggestions.get(record.id);
    if (!s || s.companyId !== record.companyId) {
      return Promise.reject(new EntityNotFoundError('Suggestion not found'));
    }
    try {
      assertPendingSuggestion(s.status);
    } catch (error) {
      return rejectWith(error);
    }
    const resolved: ExpenseSuggestionOutput = {
      ...s,
      status: 'RECHAZADA',
      rejectionReason: record.reason,
      resolvedBy: record.resolvedBy,
      resolvedAt: record.resolvedAt,
    };
    this.suggestions.set(s.id, resolved);
    return Promise.resolve(resolved);
  }
}

/** Vista del mismo almacen como `ExpenseSuggestionRepositoryPort`. */
export function suggestionRepositoryOf(
  store: InMemoryExpenses,
): ExpenseSuggestionRepositoryPort {
  return {
    create: (r) => store.createSuggestion(r),
    findAll: (f) => store.findAllSuggestions(f),
    findById: (id, companyId) => store.findSuggestionById(id, companyId),
    approve: (r) => store.approveSuggestion(r),
    reject: (r) => store.rejectSuggestion(r),
  };
}
