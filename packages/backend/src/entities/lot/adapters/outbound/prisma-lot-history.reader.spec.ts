import { PrismaLotHistoryReader } from './prisma-lot-history.reader';

describe('PrismaLotHistoryReader', () => {
  const prisma = {
    dailyReport: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    recipe: { findMany: jest.fn() },
  };

  const reader = new PrismaLotHistoryReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function nothingElse(): void {
    prisma.task.findMany.mockResolvedValue([]);
    prisma.recipe.findMany.mockResolvedValue([]);
  }

  it('does not query when there are no lots', async () => {
    await expect(reader.findHistoryByLotIds([])).resolves.toEqual(new Map());

    expect(prisma.dailyReport.findMany).not.toHaveBeenCalled();
    expect(prisma.task.findMany).not.toHaveBeenCalled();
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
  });

  it('counts reports that were not rejected, carrying their labour kind', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([
      {
        lotId: 'lot-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        laborType: { kind: 'PULVERIZACION' },
      },
    ]);
    nothingElse();

    const history = await reader.findHistoryByLotIds(['lot-1']);

    expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
      where: { lotId: { in: ['lot-1'] }, status: { not: 'RECHAZADO' } },
      select: { lotId: true, date: true, laborType: { select: { kind: true } } },
    });
    expect(history.get('lot-1')).toEqual({
      labors: [
        {
          kind: 'PULVERIZACION',
          occurredAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ],
      recipes: [],
    });
  });

  it('counts only finished tasks and dates them by their completion', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([]);
    prisma.recipe.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([
      {
        lotId: 'lot-1',
        finishedAt: new Date('2026-04-02T00:00:00.000Z'),
        laborType: { kind: 'SIEMBRA' },
      },
    ]);

    const history = await reader.findHistoryByLotIds(['lot-1']);

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        lotId: { in: ['lot-1'] },
        status: 'FINALIZADA',
        finishedAt: { not: null },
      },
      select: {
        lotId: true,
        finishedAt: true,
        laborType: { select: { kind: true } },
      },
    });
    expect(history.get('lot-1')?.labors).toEqual([
      { kind: 'SIEMBRA', occurredAt: new Date('2026-04-02T00:00:00.000Z') },
    ]);
  });

  it('counts only active recipes, and holds them apart from labours', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.recipe.findMany.mockResolvedValue([
      { lotId: 'lot-1', date: new Date('2026-05-03T00:00:00.000Z') },
    ]);

    const history = await reader.findHistoryByLotIds(['lot-1']);

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: { lotId: { in: ['lot-1'] }, status: 'ACTIVA' },
      select: { lotId: true, date: true },
    });
    expect(history.get('lot-1')).toEqual({
      labors: [],
      recipes: [{ occurredAt: new Date('2026-05-03T00:00:00.000Z') }],
    });
  });

  it('gives every requested lot an entry, even one with no events', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([
      {
        lotId: 'lot-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        laborType: { kind: 'SIEMBRA' },
      },
    ]);
    nothingElse();

    const history = await reader.findHistoryByLotIds(['lot-1', 'lot-2']);

    expect(history.get('lot-1')?.labors).toHaveLength(1);
    expect(history.get('lot-2')).toEqual({ labors: [], recipes: [] });
  });

  it('asks for every lot in one query per source', async () => {
    prisma.dailyReport.findMany.mockResolvedValue([]);
    nothingElse();

    await reader.findHistoryByLotIds(['lot-1', 'lot-2']);

    expect(prisma.dailyReport.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.task.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.recipe.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lotId: { in: ['lot-1', 'lot-2'] }, status: { not: 'RECHAZADO' } },
      }),
    );
  });
});
