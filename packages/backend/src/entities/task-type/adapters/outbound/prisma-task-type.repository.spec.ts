import { PrismaTaskTypeRepository } from './prisma-task-type.repository';

describe('PrismaTaskTypeRepository', () => {
  const prisma = {
    taskType: {
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

  const repository = new PrismaTaskTypeRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list/read/duplicate checks by tenantId', async () => {
    prisma.taskType.findMany.mockResolvedValue([{ id: 'task-type-1' }]);
    prisma.taskType.findFirst.mockResolvedValue({ id: 'task-type-1' });

    await expect(repository.findAllByCompanyId('tenant-1')).resolves.toEqual([
      { id: 'task-type-1' },
    ]);
    await expect(repository.findByIdForCompany('task-type-1', 'tenant-1')).resolves.toEqual({
      id: 'task-type-1',
    });
    await expect(
      repository.findByNameAndCompanyId('Mantenimiento', 'tenant-1'),
    ).resolves.toEqual({ id: 'task-type-1' });

    expect(prisma.taskType.findMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    expect(prisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-type-1', tenantId: 'tenant-1' },
    });
    expect(prisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { name: 'Mantenimiento', tenantId: 'tenant-1' },
    });
  });

  it('writes tenant-scoped task-type changes', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);
    prisma.taskType.create.mockResolvedValue({ id: 'task-type-2' });
    prisma.taskType.update.mockResolvedValue({ id: 'task-type-2' });
    prisma.taskType.delete.mockResolvedValue({});

    await expect(
      repository.findByIdsForCompany(['task-1'], 'tenant-1'),
    ).resolves.toEqual([{ id: 'task-1' }]);
    await expect(
      repository.create({ tenantId: 'tenant-1', name: 'Mantenimiento' }),
    ).resolves.toEqual({ id: 'task-type-2' });
    await expect(
      repository.updateForCompany('task-type-2', 'tenant-1', { name: 'Nuevo nombre' }),
    ).resolves.toEqual({ id: 'task-type-2' });
    await expect(repository.deleteForCompany('task-type-2', 'tenant-1')).resolves.toBeUndefined();

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['task-1'] }, taskType: { tenantId: 'tenant-1' } },
      select: { id: true },
    });
    expect(prisma.taskType.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', name: 'Mantenimiento' },
    });
    expect(prisma.taskType.update).toHaveBeenCalledWith({
      where: { id: 'task-type-1' },
      data: { name: 'Nuevo nombre' },
    });
    expect(prisma.taskType.delete).toHaveBeenCalledWith({
      where: { id: 'task-type-1' },
    });
  });
});
