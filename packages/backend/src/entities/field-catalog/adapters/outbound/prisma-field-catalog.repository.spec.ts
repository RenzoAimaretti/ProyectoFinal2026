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
  };
  const repository = new PrismaFieldCatalogRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('scopes company and machines to the firma and taxonomy to the tenant', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'company-1', name: 'Eliggi' });
    prisma.client.findMany.mockResolvedValue([]);
    prisma.farm.findMany.mockResolvedValue([]);
    prisma.lot.findMany.mockResolvedValue([]);
    prisma.laborType.findMany.mockResolvedValue([{ id: 'labor-1', name: 'Siembra' }]);
    prisma.machine.findMany.mockResolvedValue([
      { id: 'machine-1', companyId: 'company-1', name: 'Tractor', brand: null, status: 'ACTIVA' },
    ]);
    prisma.task.findMany.mockResolvedValue([
      { id: 'task-1', lotId: 'lot-1', laborTypeId: 'labor-1', status: 'PENDIENTE', operators: [{ id: 'u-1' }] },
    ]);

    const catalog = await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'company-1',
    });

    expect(catalog.companies).toEqual([{ id: 'company-1', name: 'Eliggi' }]);
    expect(catalog.machines).toHaveLength(1);
    expect(catalog.tasks[0].operators).toEqual([{ id: 'u-1' }]);

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-1', tenantId: 'tenant-1' },
      select: { id: true, name: true },
    });
    expect(prisma.machine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'company-1' } }),
    );
    expect(prisma.laborType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lot: { farm: { client: { tenantId: 'tenant-1' } } } },
      }),
    );
  });

  it('returns no company when the firma is outside the tenant', async () => {
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.client.findMany.mockResolvedValue([]);
    prisma.farm.findMany.mockResolvedValue([]);
    prisma.lot.findMany.mockResolvedValue([]);
    prisma.laborType.findMany.mockResolvedValue([]);
    prisma.machine.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);

    const catalog = await repository.findCatalog({
      tenantId: 'tenant-1',
      companyId: 'foreign',
    });

    expect(catalog.companies).toEqual([]);
  });
});
