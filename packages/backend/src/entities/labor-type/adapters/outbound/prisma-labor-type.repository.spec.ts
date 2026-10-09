import { PrismaLaborTypeRepository } from './prisma-labor-type.repository';

describe('PrismaLaborTypeRepository', () => {
  const prisma = {
    laborType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
  };

  const repository = new PrismaLaborTypeRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list/read/duplicate checks by tenantId', async () => {
    prisma.laborType.findMany.mockResolvedValue([{ id: 'labor-type-1' }]);
    prisma.laborType.findFirst.mockResolvedValue({ id: 'labor-type-1' });

    await expect(repository.findAllByTenantId('tenant-1')).resolves.toEqual([
      { id: 'labor-type-1' },
    ]);
    await expect(repository.findByIdForTenant('labor-type-1', 'tenant-1')).resolves.toEqual({
      id: 'labor-type-1',
    });
    await expect(
      repository.findByNameAndTenantId('Mantenimiento', 'tenant-1'),
    ).resolves.toEqual({ id: 'labor-type-1' });

    expect(prisma.laborType.findMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    expect(prisma.laborType.findFirst).toHaveBeenCalledWith({
      where: { id: 'labor-type-1', tenantId: 'tenant-1' },
    });
    expect(prisma.laborType.findFirst).toHaveBeenCalledWith({
      where: { name: 'Mantenimiento', tenantId: 'tenant-1' },
    });
  });

  it('writes tenant-scoped labor-type changes', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);
    prisma.laborType.create.mockResolvedValue({ id: 'labor-type-2' });
    prisma.laborType.update.mockResolvedValue({ id: 'labor-type-2' });
    prisma.laborType.delete.mockResolvedValue({});

    await expect(
      repository.findByIdsForTenant(['task-1'], 'tenant-1'),
    ).resolves.toEqual([{ id: 'task-1' }]);
    await expect(
      repository.create({ tenantId: 'tenant-1', name: 'Mantenimiento' }),
    ).resolves.toEqual({ id: 'labor-type-2' });
    await expect(
      repository.updateForTenant('labor-type-2', 'tenant-1', { name: 'Nuevo nombre' }),
    ).resolves.toEqual({ id: 'labor-type-2' });
    await expect(repository.deleteForTenant('labor-type-2', 'tenant-1')).resolves.toBeUndefined();

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['task-1'] }, laborType: { tenantId: 'tenant-1' } },
      select: { id: true },
    });
    expect(prisma.laborType.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', name: 'Mantenimiento' },
    });
    expect(prisma.laborType.update).toHaveBeenCalledWith({
      where: { id: 'labor-type-1' },
      data: { name: 'Nuevo nombre' },
    });
    expect(prisma.laborType.delete).toHaveBeenCalledWith({
      where: { id: 'labor-type-1' },
    });
  });
});
