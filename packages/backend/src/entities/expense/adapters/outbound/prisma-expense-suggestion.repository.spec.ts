import { Prisma } from '../../../../../prisma/generated/client';
import { Dec } from '../../../valuation/domain/decimal';
import {
  ConcurrentModificationError,
  DuplicateEntityError,
  EntityNotFoundError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
} from '../../domain/errors';
import { PrismaExpenseSuggestionRepository } from './prisma-expense-suggestion.repository';

const T0 = new Date('2026-11-20T10:00:00.000Z');
const NOW = new Date('2026-11-23T12:00:00.000Z');

function expenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    companyId: 'company-1',
    lotId: 'lot-1',
    categoryId: 'cat-1',
    date: new Date('2026-11-20T00:00:00Z'),
    description: 'Flete',
    amount: new Prisma.Decimal('90000'),
    unit: 'ARS',
    grain: null,
    amountArs: new Prisma.Decimal('90000'),
    deletedAt: null,
    updatedAt: T0,
    ...overrides,
  };
}

function suggestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sug-1',
    expenseId: 'exp-1',
    companyId: 'company-1',
    kind: 'EDICION',
    status: 'PENDIENTE',
    proposedLotId: null,
    proposedCategoryId: null,
    proposedDate: null,
    proposedDescription: null,
    proposedAmount: new Prisma.Decimal('120000'),
    proposedUnit: null,
    proposedGrain: null,
    suggestedBy: 'sup-1',
    rejectionReason: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: T0,
    expense: expenseRow(),
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
    findFirst: jest.fn().mockResolvedValue(expenseRow()),
    update: jest.fn().mockResolvedValue(expenseRow()),
  };
  const expenseSuggestion = {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([suggestionRow()]),
    create: jest.fn().mockResolvedValue(suggestionRow()),
    update: jest.fn().mockResolvedValue(suggestionRow({ status: 'APROBADA' })),
  };
  const tx = { expense, expenseSuggestion };
  const prisma = {
    expense: { update: jest.fn(), findFirst: jest.fn() },
    expenseSuggestion: {
      findFirst: jest.fn().mockResolvedValue(suggestionRow()),
      findMany: expenseSuggestion.findMany,
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn<
      Promise<unknown>,
      [(t: typeof tx) => Promise<unknown>, unknown?]
    >((cb) => cb(tx)),
  };
  return {
    expense,
    expenseSuggestion,
    prisma,
    repository: new PrismaExpenseSuggestionRepository(prisma as never),
  };
}

const INCLUDE = { expense: true };

describe('PrismaExpenseSuggestionRepository reads', () => {
  it('maps proposed values and the expense summary, with deleted flag', async () => {
    const { repository, prisma } = build();
    prisma.expenseSuggestion.findFirst.mockResolvedValueOnce(
      suggestionRow({ expense: expenseRow({ deletedAt: NOW }) }),
    );

    const result = await repository.findById('sug-1', 'company-1');

    expect(prisma.expenseSuggestion.findFirst).toHaveBeenCalledWith({
      where: { id: 'sug-1', companyId: 'company-1' },
      include: INCLUDE,
    });
    expect(result).toEqual({
      id: 'sug-1',
      expenseId: 'exp-1',
      companyId: 'company-1',
      kind: 'EDICION',
      status: 'PENDIENTE',
      proposed: {
        lotId: null,
        categoryId: null,
        date: null,
        description: null,
        amount: '120000.0000',
        unit: null,
        grain: null,
      },
      suggestedBy: 'sup-1',
      rejectionReason: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: T0,
      expense: {
        id: 'exp-1',
        lotId: 'lot-1',
        categoryId: 'cat-1',
        date: new Date('2026-11-20T00:00:00Z'),
        description: 'Flete',
        amount: '90000.0000',
        unit: 'ARS',
        grain: null,
        amountArs: '90000.0000',
        deleted: true,
      },
    });
  });

  it('scopes the listing by firma and, for a supervisor, by author', async () => {
    const { repository, expenseSuggestion } = build();

    await repository.findAll({
      companyId: 'company-1',
      status: 'RECHAZADA',
      suggestedBy: 'sup-1',
    });
    await repository.findAll({ companyId: 'company-1' });

    expect(expenseSuggestion.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: 'company-1',
        status: 'RECHAZADA',
        suggestedBy: 'sup-1',
      },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
    expect(expenseSuggestion.findMany).toHaveBeenNthCalledWith(2, {
      where: { companyId: 'company-1' },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  });

  it('does not filter out suggestions whose expense was soft-deleted', async () => {
    const { repository, expenseSuggestion } = build();

    await repository.findAll({ companyId: 'company-1', suggestedBy: 'sup-1' });

    const [args] = expenseSuggestion.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    const where = args.where;
    expect(JSON.stringify(where)).not.toContain('deletedAt');
  });
});

describe('PrismaExpenseSuggestionRepository.create', () => {
  const record = {
    expenseId: 'exp-1',
    companyId: 'company-1',
    kind: 'EDICION' as const,
    proposed: { amount: Dec.parse('120000'), description: 'Corregido' },
    suggestedBy: 'sup-1',
  };

  it('creates the PENDIENTE suggestion in a Serializable transaction after checking expense and pending', async () => {
    const { repository, prisma, expense, expenseSuggestion } = build();

    await repository.create(record);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(expense.findFirst).toHaveBeenCalledWith({
      where: { id: 'exp-1', companyId: 'company-1', deletedAt: null },
      select: { id: true },
    });
    expect(expenseSuggestion.findFirst).toHaveBeenCalledWith({
      where: { expenseId: 'exp-1', status: 'PENDIENTE' },
      select: { id: true },
    });
    expect(expenseSuggestion.create).toHaveBeenCalledWith({
      data: {
        expenseId: 'exp-1',
        companyId: 'company-1',
        kind: 'EDICION',
        proposedLotId: null,
        proposedCategoryId: null,
        proposedDate: null,
        proposedDescription: 'Corregido',
        proposedAmount: '120000',
        proposedUnit: null,
        proposedGrain: null,
        suggestedBy: 'sup-1',
      },
      include: INCLUDE,
    });
    expect(prisma.expenseSuggestion.create).not.toHaveBeenCalled();
  });

  it('a BAJA stores no proposed values', async () => {
    const { repository, expenseSuggestion } = build();

    await repository.create({ ...record, kind: 'BAJA', proposed: null });

    expect(expenseSuggestion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: 'BAJA',
        proposedLotId: null,
        proposedAmount: null,
        proposedDescription: null,
      }) as Record<string, unknown>,
      include: INCLUDE,
    });
  });

  it('answers 409 (PendingSuggestionError) when another suggestion is pending and writes nothing', async () => {
    const { repository, expenseSuggestion } = build();
    expenseSuggestion.findFirst.mockResolvedValueOnce({ id: 'sug-0' });

    await expect(repository.create(record)).rejects.toBeInstanceOf(
      PendingSuggestionError,
    );
    expect(expenseSuggestion.create).not.toHaveBeenCalled();
  });

  it('translates the partial unique index violation P2002 to DuplicateEntityError', async () => {
    const { repository, prisma } = build();
    prisma.$transaction.mockRejectedValueOnce(knownError('P2002'));

    await expect(repository.create(record)).rejects.toBeInstanceOf(
      DuplicateEntityError,
    );
  });

  it('translates P2034 to a retry conflict and propagates other errors', async () => {
    const { repository, prisma } = build();
    prisma.$transaction.mockRejectedValueOnce(knownError('P2034'));
    await expect(repository.create(record)).rejects.toBeInstanceOf(
      ConcurrentModificationError,
    );

    const other = new Error('down');
    prisma.$transaction.mockRejectedValueOnce(other);
    await expect(repository.create(record)).rejects.toBe(other);
  });

  it('answers not found when the expense is not live for the firma', async () => {
    const { repository, expense } = build();
    expense.findFirst.mockResolvedValueOnce(null);

    await expect(repository.create(record)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
  });
});

describe('PrismaExpenseSuggestionRepository.approve (atomic)', () => {
  const base = {
    id: 'sug-1',
    companyId: 'company-1',
    resolvedBy: 'admin-1',
    resolvedAt: NOW,
  };
  const edition = {
    kind: 'EDICION' as const,
    expectedUpdatedAt: T0,
    lotId: 'lot-1',
    categoryId: 'cat-2',
    date: new Date('2026-11-20T00:00:00Z'),
    description: 'Flete',
    revaluation: null,
  };

  function withPending(
    ctx: ReturnType<typeof build>,
    overrides: Record<string, unknown> = {},
  ) {
    ctx.expenseSuggestion.findFirst.mockResolvedValueOnce(
      suggestionRow(overrides),
    );
  }

  it('applies the EDICION to the expense and marks the suggestion APROBADA in ONE Serializable transaction', async () => {
    const ctx = build();
    withPending(ctx);

    const result = await ctx.repository.approve({ ...base, apply: edition });

    expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(ctx.expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: {
        lotId: 'lot-1',
        categoryId: 'cat-2',
        date: new Date('2026-11-20T00:00:00Z'),
        description: 'Flete',
        updatedBy: 'admin-1',
      },
    });
    expect(ctx.expenseSuggestion.update).toHaveBeenCalledWith({
      where: { id: 'sug-1' },
      data: { status: 'APROBADA', resolvedBy: 'admin-1', resolvedAt: NOW },
      include: INCLUDE,
    });
    expect(result.status).toBe('APROBADA');
    expect(ctx.prisma.expense.update).not.toHaveBeenCalled();
    expect(ctx.prisma.expenseSuggestion.update).not.toHaveBeenCalled();
  });

  it('writes the new valuation when the edition revalues', async () => {
    const ctx = build();
    withPending(ctx);

    await ctx.repository.approve({
      ...base,
      apply: {
        ...edition,
        revaluation: {
          money: { amount: Dec.parse('300'), unit: 'KG_CEREAL', grain: 'MAIZ' },
          valuation: {
            amountArs: '58500.00',
            grainArsPerTon: '195000',
            usdRate: null,
            usdRateType: null,
            priceSource: 'cac.bcr.com.ar',
            priceFetchedAt: NOW,
            priceStale: false,
          },
          valuedAt: NOW,
        },
      },
    });

    expect(ctx.expense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: '300',
          unit: 'KG_CEREAL',
          grain: 'MAIZ',
          amountArs: '58500.00',
          valuedAt: NOW,
        }) as Record<string, unknown>,
      }),
    );
  });

  it('a BAJA soft-deletes the expense (deletedAt/deletedBy) and marks the suggestion APROBADA, never deleting rows', async () => {
    const ctx = build();
    withPending(ctx, { kind: 'BAJA', proposedAmount: null });

    await ctx.repository.approve({ ...base, apply: { kind: 'BAJA' } });

    expect(ctx.expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: { deletedAt: NOW, deletedBy: 'admin-1', updatedBy: 'admin-1' },
    });
    expect(ctx.expenseSuggestion.update).toHaveBeenCalledWith({
      where: { id: 'sug-1' },
      data: { status: 'APROBADA', resolvedBy: 'admin-1', resolvedAt: NOW },
      include: INCLUDE,
    });
  });

  it('answers 409 when the suggestion is no longer PENDIENTE and changes nothing', async () => {
    const ctx = build();
    withPending(ctx, { status: 'APROBADA' });

    await expect(
      ctx.repository.approve({ ...base, apply: edition }),
    ).rejects.toBeInstanceOf(SuggestionAlreadyResolvedError);
    expect(ctx.expense.update).not.toHaveBeenCalled();
    expect(ctx.expenseSuggestion.update).not.toHaveBeenCalled();
  });

  it('answers not found for a suggestion of another firma or whose expense is gone', async () => {
    const ctx = build();
    ctx.expenseSuggestion.findFirst.mockResolvedValueOnce(null);
    await expect(
      ctx.repository.approve({ ...base, apply: edition }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    withPending(ctx);
    ctx.expense.findFirst.mockResolvedValueOnce(null);
    await expect(
      ctx.repository.approve({ ...base, apply: edition }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(ctx.expenseSuggestion.update).not.toHaveBeenCalled();
  });

  it('answers a concurrency conflict when the expense changed since it was read, and a P2034 as retry', async () => {
    const ctx = build();
    withPending(ctx);
    ctx.expense.findFirst.mockResolvedValueOnce(expenseRow({ updatedAt: NOW }));
    await expect(
      ctx.repository.approve({ ...base, apply: edition }),
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
    expect(ctx.expenseSuggestion.update).not.toHaveBeenCalled();

    ctx.prisma.$transaction.mockRejectedValueOnce(knownError('P2034'));
    await expect(
      ctx.repository.approve({ ...base, apply: edition }),
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
  });
});

describe('PrismaExpenseSuggestionRepository.reject', () => {
  const record = {
    id: 'sug-1',
    companyId: 'company-1',
    resolvedBy: 'admin-1',
    resolvedAt: NOW,
    reason: 'monto correcto',
  };

  it('marks RECHAZADA with reason and resolver inside a Serializable transaction, leaving the expense alone', async () => {
    const ctx = build();
    ctx.expenseSuggestion.findFirst.mockResolvedValueOnce(suggestionRow());
    ctx.expenseSuggestion.update.mockResolvedValueOnce(
      suggestionRow({ status: 'RECHAZADA', rejectionReason: 'monto correcto' }),
    );

    const result = await ctx.repository.reject(record);

    expect(ctx.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(ctx.expenseSuggestion.update).toHaveBeenCalledWith({
      where: { id: 'sug-1' },
      data: {
        status: 'RECHAZADA',
        rejectionReason: 'monto correcto',
        resolvedBy: 'admin-1',
        resolvedAt: NOW,
      },
      include: INCLUDE,
    });
    expect(ctx.expense.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'RECHAZADA',
      rejectionReason: 'monto correcto',
    });
  });

  it('answers 409 when the suggestion is already resolved', async () => {
    const ctx = build();
    ctx.expenseSuggestion.findFirst.mockResolvedValueOnce(
      suggestionRow({ status: 'RECHAZADA' }),
    );

    await expect(ctx.repository.reject(record)).rejects.toBeInstanceOf(
      SuggestionAlreadyResolvedError,
    );
    expect(ctx.expenseSuggestion.update).not.toHaveBeenCalled();
  });
});
