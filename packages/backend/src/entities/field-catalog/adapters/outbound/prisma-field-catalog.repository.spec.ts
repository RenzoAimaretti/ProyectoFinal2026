import { PrismaFieldCatalogRepository } from './prisma-field-catalog.repository';

describe('PrismaFieldCatalogRepository', () => {
  const prisma = {
    company: { findFirst: jest.fn() },
    client: { findMany: jest.fn() },
    farm: { findMany: jest.fn() },
    lot: { findMany: jest.fn() },
    laborType: { findMany: jest.fn() },
    machine: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    inputCategory: { findMany: jest.fn() },
    input: { findMany: jest.fn() },
    laborTypeCategory: { findMany: jest.fn() },
    recipe: { findMany: jest.fn() },
  };
  const repository = new PrismaFieldCatalogRepository(prisma as never);

  const tenantClient = { tenantId: 'tenant-1', deleted: false };
  const tenantFarm = { deleted: false, client: tenantClient };
  const tenantLot = { deleted: false, farm: tenantFarm };

  function mockEmptyCatalog() {
    prisma.company.findFirst.mockResolvedValue(null);
    for (const model of [
      prisma.client,
      prisma.farm,
      prisma.lot,
      prisma.laborType,
      prisma.machine,
      prisma.task,
      prisma.inputCategory,
      prisma.input,
      prisma.laborTypeCategory,
      prisma.recipe,
    ]) {
      model.findMany.mockResolvedValue([]);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyCatalog();
  });

  it('scopes company and machines to the firma and taxonomy to the tenant', async () => {
    prisma.company.findFirst.mockResolvedValue({
      id: 'company-1',
      name: 'Eliggi',
      cuit: '30-1-1',
    });
    prisma.laborType.findMany.mockResolvedValue([
      { id: 'labor-1', name: 'Siembra' },
    ]);
    prisma.machine.findMany.mockResolvedValue([
      {
        id: 'machine-1',
        companyId: 'company-1',
        name: 'Tractor',
        brand: null,
        status: 'ACTIVA',
      },
    ]);
    prisma.task.findMany.mockResolvedValue([
      {
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: 'PENDIENTE',
        operators: [{ id: 'u-1' }],
      },
    ]);

    const catalog = await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'company-1',
    });

    expect(catalog.companies).toEqual([
      { id: 'company-1', name: 'Eliggi', cuit: '30-1-1' },
    ]);
    expect(catalog.machines).toHaveLength(1);
    expect(catalog.tasks[0].operators).toEqual([{ id: 'u-1' }]);

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-1', tenantId: 'tenant-1', deleted: false },
      select: { id: true, name: true, cuit: true },
    });
    expect(prisma.machine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          deleted: false,
          company: { deleted: false },
        },
      }),
    );
    expect(prisma.laborType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deleted: false },
      }),
    );
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted: false,
          lot: tenantLot,
          laborType: { deleted: false },
        },
      }),
    );
  });

  it('excludes deleted rows and rows whose parent is deleted', async () => {
    await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'company-1',
    });

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: tenantClient }),
    );
    expect(prisma.farm.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: tenantFarm }),
    );
    expect(prisma.lot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: tenantLot }),
    );
  });

  it('exposes input categories, inputs, labor type links and active recipes of the tenant', async () => {
    prisma.inputCategory.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Herbicidas', active: true },
    ]);
    prisma.input.findMany.mockResolvedValue([
      {
        id: 'input-1',
        name: 'Glifosato',
        unit: 'L',
        categoryId: 'cat-1',
        active: true,
      },
    ]);
    prisma.laborTypeCategory.findMany.mockResolvedValue([
      { laborTypeId: 'labor-1', categoryId: 'cat-1' },
    ]);
    const date = new Date('2026-11-01T00:00:00.000Z');
    prisma.recipe.findMany.mockResolvedValue([
      {
        id: 'recipe-1',
        lotId: 'lot-1',
        date,
        observations: null,
        items: [
          {
            id: 'item-1',
            inputId: 'input-1',
            dose: 2,
            unit: 'L',
            loadOrder: 1,
          },
        ],
      },
    ]);

    const catalog = await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'company-1',
    });

    expect(catalog.inputCategories).toEqual([
      { id: 'cat-1', name: 'Herbicidas', active: true },
    ]);
    expect(catalog.inputs).toEqual([
      {
        id: 'input-1',
        name: 'Glifosato',
        unit: 'L',
        categoryId: 'cat-1',
        active: true,
      },
    ]);
    expect(catalog.laborTypeCategories).toEqual([
      { laborTypeId: 'labor-1', categoryId: 'cat-1' },
    ]);
    expect(catalog.recipes).toEqual([
      {
        id: 'recipe-1',
        lotId: 'lot-1',
        date,
        observations: null,
        items: [
          {
            id: 'item-1',
            inputId: 'input-1',
            dose: 2,
            unit: 'L',
            loadOrder: 1,
          },
        ],
      },
    ]);

    expect(prisma.inputCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deleted: false },
      }),
    );
    expect(prisma.input.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          deleted: false,
          category: { deleted: false },
        },
      }),
    );
    expect(prisma.laborTypeCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          laborType: { tenantId: 'tenant-1', deleted: false },
          category: { deleted: false },
        },
      }),
    );
    const [recipeQuery] = prisma.recipe.findMany.mock.calls[0] as [
      { where: unknown; select: { items: { where: unknown } } },
    ];
    expect(recipeQuery.where).toEqual({ status: 'ACTIVA', lot: tenantLot });
    expect(recipeQuery.select.items.where).toEqual({
      input: { deleted: false, category: { deleted: false } },
    });
  });

  it('returns no company when the firma is outside the tenant', async () => {
    const catalog = await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'foreign',
    });

    expect(catalog.companies).toEqual([]);
  });
});
