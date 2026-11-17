import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  CreateTaskPrescriptionData,
  RecipeRecord,
} from '../../application/recipe.types';
import { DuplicateEntityError } from '../../domain/errors';
import { PrismaTaskPrescriptionAdapter } from './prisma-task-prescription.adapter';

const itemInclude = {
  orderBy: [{ loadOrder: 'asc' }, { id: 'asc' }],
  include: { input: { select: { name: true } } },
};

const persistedRecipe = {
  id: 'recipe-1',
  lotId: 'lot-1',
  taskId: 'task-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  pest: 'Roya',
  crop: 'Trigo',
  observations: null,
  reapplicationIntervalDays: null,
  reapplicationDate: null,
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L',
      loadOrder: 1,
    },
  ],
};

const attachData: CreateTaskPrescriptionData = {
  taskId: 'task-1',
  lotId: 'lot-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  pest: 'Roya',
  crop: 'Trigo',
  observations: null,
  reapplicationIntervalDays: null,
  reapplicationDate: null,
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  items: [
    {
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L',
      loadOrder: 1,
    },
  ],
};

describe('PrismaTaskPrescriptionAdapter', () => {
  const tx = {
    recipe: { create: jest.fn() },
    task: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    task: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  const adapter = new PrismaTaskPrescriptionAdapter(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.recipe.create.mockResolvedValue(persistedRecipe);
    tx.task.update.mockResolvedValue({ id: 'task-1' });
  });

  describe('findContextByIdForTenant', () => {
    it('reads the task facts scoped to the tenant, ignoring deleted tasks', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        status: 'PENDIENTE',
        lot: { area: 12.5 },
        laborType: { requiresPrescription: true },
      });

      await expect(
        adapter.findContextByIdForTenant('task-1', 'tenant-1'),
      ).resolves.toEqual({
        id: 'task-1',
        lotId: 'lot-1',
        status: 'PENDIENTE',
        laborTypeRequiresPrescription: true,
        lotArea: 12.5,
      });

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          deleted: false,
          lot: { farm: { client: { tenantId: 'tenant-1' } } },
        },
        select: {
          id: true,
          lotId: true,
          status: true,
          lot: { select: { area: true } },
          laborType: { select: { requiresPrescription: true } },
        },
      });
    });

    it('returns null when the task is missing or outside the tenant', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        adapter.findContextByIdForTenant('task-1', 'tenant-2'),
      ).resolves.toBeNull();
    });
  });

  describe('findPendingByTenant', () => {
    it('reads SIN_RECETA tasks tenant-scoped through lot/farm/client and maps the inbox fields', async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          lotId: 'lot-1',
          laborTypeId: 'task-type-1',
          status: 'PENDIENTE',
          startedAt: new Date('2026-01-10T00:00:00.000Z'),
          prescriptionStatus: 'SIN_RECETA',
          lot: { name: 'Lote N°1', area: 12.5, farm: { name: 'Agro-Sur' } },
          laborType: { name: 'Pulverización' },
        },
      ]);

      await expect(adapter.findPendingByTenant('tenant-1')).resolves.toEqual([
        {
          id: 'task-1',
          lotId: 'lot-1',
          lotName: 'Lote N°1',
          farmName: 'Agro-Sur',
          lotArea: 12.5,
          laborTypeId: 'task-type-1',
          laborTypeName: 'Pulverización',
          status: 'PENDIENTE',
          startedAt: new Date('2026-01-10T00:00:00.000Z'),
          prescriptionStatus: 'SIN_RECETA',
        },
      ]);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          prescriptionStatus: 'SIN_RECETA',
          lot: { farm: { client: { tenantId: 'tenant-1' } } },
        },
        select: {
          id: true,
          lotId: true,
          laborTypeId: true,
          status: true,
          startedAt: true,
          prescriptionStatus: true,
          lot: {
            select: { name: true, area: true, farm: { select: { name: true } } },
          },
          laborType: { select: { name: true } },
        },
        orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
      });
    });

    it('returns an empty inbox when nothing is pending', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await expect(adapter.findPendingByTenant('tenant-2')).resolves.toEqual([]);
    });
  });

  describe('attachPrescription', () => {
    it('runs the recipe write and the task flag in a single transaction', async () => {
      const expected: RecipeRecord = {
        id: 'recipe-1',
        lotId: 'lot-1',
        taskId: 'task-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        status: 'ACTIVA',
        pest: 'Roya',
        crop: 'Trigo',
        observations: null,
        reapplicationIntervalDays: null,
        reapplicationDate: null,
        sprayVolume: 120,
        sprayVolumeUnit: 'L/ha',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
        items: [
          {
            id: 'item-1',
            recipeId: 'recipe-1',
            inputId: 'input-1',
            dose: 3,
            dosageBasis: 'POR_HECTAREA',
            unit: 'L',
            loadOrder: 1,
          },
        ],
      };

      await expect(adapter.attachPrescription(attachData)).resolves.toEqual(
        expected,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.recipe.create).toHaveBeenCalledWith({
        data: {
          lotId: 'lot-1',
          taskId: 'task-1',
          date: new Date('2026-03-01T00:00:00.000Z'),
          status: 'ACTIVA',
          pest: 'Roya',
          crop: 'Trigo',
          observations: null,
          reapplicationIntervalDays: null,
          reapplicationDate: null,
          sprayVolume: 120,
          sprayVolumeUnit: 'L/ha',
          items: {
            create: [
              {
                inputId: 'input-1',
                dose: 3,
                dosageBasis: 'POR_HECTAREA',
                unit: 'L',
                loadOrder: 1,
              },
            ],
          },
        },
        include: { items: itemInclude },
      });
      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { prescriptionStatus: 'CON_RECETA' },
      });
    });

    it('stores the call default dosage basis when a row omits it', async () => {
      await adapter.attachPrescription({
        ...attachData,
        items: [{ inputId: 'input-1', dose: 3, unit: 'L', loadOrder: 1 }],
      });

      const [createArgs] = tx.recipe.create.mock.calls[0];
      expect(createArgs.data.items.create[0].dosageBasis).toBe('POR_HECTAREA');
    });

    it('translates a P2002 unique violation into a duplicate error', async () => {
      prisma.$transaction.mockImplementation(() =>
        Promise.reject(
          new PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '7.8.0',
          }),
        ),
      );

      await expect(
        adapter.attachPrescription(attachData),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('rethrows non P2002 errors untouched', async () => {
      const other = new Error('boom');
      prisma.$transaction.mockImplementation(() => Promise.reject(other));

      await expect(adapter.attachPrescription(attachData)).rejects.toBe(other);
    });
  });
});
