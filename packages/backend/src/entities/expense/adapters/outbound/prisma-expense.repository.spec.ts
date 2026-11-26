import { Prisma } from '../../../../../prisma/generated/client';
import { Dec } from '../../../valuation/domain/decimal';
import {
  ConcurrentModificationError,
  DuplicateEntityError,
  EntityNotFoundError,
  PendingSuggestionError,
} from '../../domain/errors';
import { PrismaExpenseRepository } from './prisma-expense.repository';

const T0 = new Date('2026-11-20T10:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    companyId: 'company-1',
    lotId: 'lot-1',
    categoryId: 'cat-1',
    date: new Date('2026-11-20T00:00:00Z'),
    description: 'Flete',
    amount: new Prisma.Decimal('300'),
    unit: 'KG_CEREAL',
    grain: 'MAIZ',
    grainArsPerTon: new Prisma.Decimal('195000'),
    usdRate: null,
    usdRateType: null,
    priceSource: 'cac.bcr.com.ar',
    priceFetchedAt: T0,
    priceStale: false,
    amountArs: new Prisma.Decimal('58500'),
    valuedAt: T0,
    createdBy: 'sup-1',
    updatedBy: 'sup-1',
    deletedAt: null,
    deletedBy: null,
    createdAt: T0,
    updatedAt: T0,
    suggestions: [],
    ...overrides,
  };
}

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });
}

function build() {
  const expense = {
    create: jest.fn().mockResolvedValue(row()),
    findMany: jest.fn().mockResolvedValue([row()]),
    findFirst: jest.fn().mockResolvedValue(row()),
    update: jest.fn().mockResolvedValue(row()),
  };
  const expenseSuggestion = { findFirst: jest.fn().mockResolvedValue(null) };
  const tx = { expense, expenseSuggestion };
  const prisma = {
    expense: { ...expense },
    expenseSuggestion: { findFirst: jest.fn() },
    $transaction: jest.fn<
      Promise<unknown>,
      [(t: typeof tx) => Promise<unknown>, unknown?]
    >((cb) => cb(tx)),
  };
  return {
    expense,
    expenseSuggestion,
    prisma,
    repository: new PrismaExpenseRepository(prisma as never),
  };
}

const revaluation = {
  money: {
    amount: Dec.parse('500'),
    unit: 'KG_CEREAL' as const,
    grain: 'SOJA' as const,
  },
  valuation: {
    amountArs: '200000.00',
    grainArsPerTon: '400000',
    usdRate: null,
    usdRateType: null,
    priceSource: 'cac.bcr.com.ar',
    priceFetchedAt: T0,
    priceStale: true,
  },
  valuedAt: new Date('2026-11-23T12:00:00Z'),
};

const update = {
  id: 'exp-1',
  companyId: 'company-1',
  userId: 'admin-1',
  expectedUpdatedAt: T0,
  lotId: 'lot-2',
  categoryId: 'cat-2',
  date: new Date('2026-11-21T00:00:00Z'),
  description: 'Otro',
  revaluation: null,
};

describe('PrismaExpenseRepository reads', () => {
  it('maps Decimal columns to 4-decimal strings and exposes the pending suggestion id', async () => {
    const { repository, expense } = build();
    expense.findFirst.mockResolvedValueOnce(
      row({ suggestions: [{ id: 'sug-1' }] }),
    );

    const result = await repository.findById('exp-1', 'company-1');

    expect(expense.findFirst).toHaveBeenCalledWith({
      where: { id: 'exp-1', companyId: 'company-1', deletedAt: null },
      include: {
        suggestions: {
          where: { status: 'PENDIENTE' },
          select: { id: true },
          take: 1,
        },
      },
    });
    expect(result).toMatchObject({
      id: 'exp-1',
      amount: '300.0000',
      amountArs: '58500.0000',
      grainArsPerTon: '195000.0000',
      usdRate: null,
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      pendingSuggestionId: 'sug-1',
    });
  });

  it('lists scoped by firma, excluding deleted expenses, with the lot, category and date filters', async () => {
    const { repository, expense } = build();

    await repository.findAll('company-1', {
      lotId: 'lot-1',
      categoryId: 'cat-1',
      from: new Date('2026-07-01T00:00:00Z'),
      to: new Date('2026-12-31T00:00:00Z'),
    });
    await repository.findAll('company-1', {});

    expect(expense.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: 'company-1',
        deletedAt: null,
        lotId: 'lot-1',
        categoryId: 'cat-1',
        date: {
          gte: new Date('2026-07-01T00:00:00Z'),
          lte: new Date('2026-12-31T00:00:00Z'),
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        suggestions: {
          where: { status: 'PENDIENTE' },
          select: { id: true },
          take: 1,
        },
      },
    });
    expect(expense.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { companyId: 'company-1', deletedAt: null },
      }),
    );
  });

  it('returns null when the expense does not exist for the firma', async () => {
    const { repository, expense } = build();
    expense.findFirst.mockResolvedValueOnce(null);

    await expect(repository.findById('x', 'company-1')).resolves.toBeNull();
  });
});

describe('PrismaExpenseRepository.create', () => {
  it('persists the money, the valuation and createdBy/updatedBy on the firma of the caller', async () => {
    const { repository, expense } = build();

    await repository.create({
      companyId: 'company-1',
      lotId: 'lot-1',
      categoryId: 'cat-1',
      date: new Date('2026-11-20T00:00:00Z'),
      description: 'Flete',
      money: revaluation.money,
      valuation: revaluation.valuation,
      valuedAt: revaluation.valuedAt,
      userId: 'sup-1',
    });

    expect(expense.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        lotId: 'lot-1',
        categoryId: 'cat-1',
        date: new Date('2026-11-20T00:00:00Z'),
        description: 'Flete',
        amount: '500',
        unit: 'KG_CEREAL',
        grain: 'SOJA',
        grainArsPerTon: '400000',
        usdRate: null,
        usdRateType: null,
        priceSource: 'cac.bcr.com.ar',
        priceFetchedAt: T0,
        priceStale: true,
        amountArs: '200000.00',
        valuedAt: revaluation.valuedAt,
        createdBy: 'sup-1',
        updatedBy: 'sup-1',
      },
      include: {
        suggestions: {
          where: { status: 'PENDIENTE' },
          select: { id: true },
          take: 1,
        },
      },
    });
  });
});

describe('PrismaExpenseRepository.updateDirect (R-FIN-11 concurrency)', () => {
  it('runs in one Serializable transaction, checks the pending suggestion inside it and never writes outside it', async () => {
    const { repository, prisma, expense, expenseSuggestion } = build();

    await repository.updateDirect(update);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(expense.findFirst).toHaveBeenCalledWith({
      where: { id: 'exp-1', companyId: 'company-1', deletedAt: null },
    });
    expect(expenseSuggestion.findFirst).toHaveBeenCalledWith({
      where: { expenseId: 'exp-1', status: 'PENDIENTE' },
      select: { id: true },
    });
    expect(prisma.expenseSuggestion.findFirst).not.toHaveBeenCalled();
  });

  it('keeps the original valuation (no money or price columns) when there is no revaluation, and always saves updatedBy', async () => {
    const { repository, expense } = build();

    await repository.updateDirect(update);

    expect(expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: {
        lotId: 'lot-2',
        categoryId: 'cat-2',
        date: new Date('2026-11-21T00:00:00Z'),
        description: 'Otro',
        updatedBy: 'admin-1',
      },
      include: {
        suggestions: {
          where: { status: 'PENDIENTE' },
          select: { id: true },
          take: 1,
        },
      },
    });
  });

  it('writes money and valuation columns when revaluing', async () => {
    const { repository, expense } = build();

    await repository.updateDirect({ ...update, revaluation });

    expect(expense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: '500',
          unit: 'KG_CEREAL',
          grain: 'SOJA',
          grainArsPerTon: '400000',
          priceStale: true,
          amountArs: '200000.00',
          valuedAt: revaluation.valuedAt,
          updatedBy: 'admin-1',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('answers PendingSuggestionError and does not write when a suggestion is pending', async () => {
    const { repository, expense, expenseSuggestion } = build();
    expenseSuggestion.findFirst.mockResolvedValueOnce({ id: 'sug-1' });

    await expect(repository.updateDirect(update)).rejects.toBeInstanceOf(
      PendingSuggestionError,
    );
    expect(expense.update).not.toHaveBeenCalled();
  });

  it('answers not found for a missing, other-firma or deleted expense', async () => {
    const { repository, expense } = build();
    expense.findFirst.mockResolvedValueOnce(null);

    await expect(repository.updateDirect(update)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
    expect(expense.update).not.toHaveBeenCalled();
  });

  it('answers a concurrency conflict when the expense changed since it was read', async () => {
    const { repository, expense } = build();
    expense.findFirst.mockResolvedValueOnce(
      row({ updatedAt: new Date('2026-11-22T00:00:00Z') }),
    );

    await expect(repository.updateDirect(update)).rejects.toBeInstanceOf(
      ConcurrentModificationError,
    );
    expect(expense.update).not.toHaveBeenCalled();
  });

  it('translates the serialization failure P2034 to a retry conflict and P2002 to DuplicateEntityError', async () => {
    const { repository, prisma } = build();
    prisma.$transaction.mockRejectedValueOnce(knownError('P2034'));
    await expect(repository.updateDirect(update)).rejects.toBeInstanceOf(
      ConcurrentModificationError,
    );

    prisma.$transaction.mockRejectedValueOnce(knownError('P2002'));
    await expect(repository.updateDirect(update)).rejects.toBeInstanceOf(
      DuplicateEntityError,
    );
  });

  it('propagates any other error untouched', async () => {
    const { repository, prisma } = build();
    const other = new Error('connection lost');
    prisma.$transaction.mockRejectedValueOnce(other);

    await expect(repository.updateDirect(update)).rejects.toBe(other);
  });
});

describe('PrismaExpenseRepository.softDelete', () => {
  const remove = {
    id: 'exp-1',
    companyId: 'company-1',
    userId: 'admin-1',
    expectedUpdatedAt: T0,
    deletedAt: new Date('2026-11-23T12:00:00Z'),
  };

  it('sets deletedAt, deletedBy and updatedBy in a Serializable transaction instead of deleting the row', async () => {
    const { repository, prisma, expense } = build();

    await repository.softDelete(remove);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: {
        deletedAt: new Date('2026-11-23T12:00:00Z'),
        deletedBy: 'admin-1',
        updatedBy: 'admin-1',
      },
    });
  });

  it('refuses with PendingSuggestionError when a suggestion is pending', async () => {
    const { repository, expense, expenseSuggestion } = build();
    expenseSuggestion.findFirst.mockResolvedValueOnce({ id: 'sug-1' });

    await expect(repository.softDelete(remove)).rejects.toBeInstanceOf(
      PendingSuggestionError,
    );
    expect(expense.update).not.toHaveBeenCalled();
  });
});
