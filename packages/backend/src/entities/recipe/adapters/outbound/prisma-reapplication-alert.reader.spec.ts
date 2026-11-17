import { PrismaReapplicationAlertReader } from './prisma-reapplication-alert.reader';

describe('PrismaReapplicationAlertReader', () => {
  let prisma: {
    recipe: {
      findMany: jest.Mock;
    };
  };
  let reader: PrismaReapplicationAlertReader;

  beforeEach(() => {
    prisma = {
      recipe: {
        findMany: jest.fn(),
      },
    };
    reader = new PrismaReapplicationAlertReader(prisma as never);
  });

  it('queries active recipes with reapplication plan scoped by tenant', async () => {
    const rawDate = new Date('2026-11-10T10:00:00Z');
    const rawReapplyDate = new Date('2026-11-20T00:00:00Z');

    prisma.recipe.findMany.mockResolvedValue([
      {
        id: 'recipe-1',
        lotId: 'lot-1',
        date: rawDate,
        pest: 'Oruga',
        crop: 'Soja',
        observations: 'Pulverizar con poco viento',
        sprayVolume: 100,
        sprayVolumeUnit: 'L/ha',
        reapplicationIntervalDays: 10,
        reapplicationDate: rawReapplyDate,
        taskId: 'task-1',
        task: {
          status: 'EN_PROGRESO',
        },
        lot: {
          name: 'Lote 1',
          farm: {
            name: 'La María',
            client: {
              name: 'Cliente Agro',
            },
          },
        },
      },
    ]);

    const result = await reader.findCandidateRecipesForAlerts('tenant-123');

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        lot: { farm: { client: { tenantId: 'tenant-123' } } },
        status: 'ACTIVA',
        OR: [
          { reapplicationDate: { not: null } },
          { reapplicationIntervalDays: { not: null } },
        ],
      },
      select: expect.objectContaining({
        id: true,
        lotId: true,
        date: true,
        pest: true,
        crop: true,
        reapplicationIntervalDays: true,
        reapplicationDate: true,
        taskId: true,
      }),
      orderBy: [{ date: 'desc' }],
    });

    expect(result).toEqual([
      {
        id: 'recipe-1',
        lotId: 'lot-1',
        lotName: 'Lote 1',
        farmName: 'La María',
        clientName: 'Cliente Agro',
        taskId: 'task-1',
        taskStatus: 'EN_PROGRESO',
        date: rawDate,
        pest: 'Oruga',
        crop: 'Soja',
        observations: 'Pulverizar con poco viento',
        sprayVolume: 100,
        sprayVolumeUnit: 'L/ha',
        reapplicationIntervalDays: 10,
        reapplicationDate: rawReapplyDate,
      },
    ]);
  });
});
