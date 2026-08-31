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

  it('scopes list/read/duplicate checks by companyId', async () => {
    prisma.taskType.findMany.mockResolvedValue([{ id: 'task-type-1' }]);
    prisma.taskType.findFirst.mockResolvedValue({ id: 'task-type-1' });

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'task-type-1' },
    ]);
    await expect(repository.findByIdForCompany('task-type-1', 'company-1')).resolves.toEqual({
      id: 'task-type-1',
    });
    await expect(
      repository.findByNameAndCompanyId('Mantenimiento', 'company-1'),
    ).resolves.toEqual({ id: 'task-type-1' });

    expect(prisma.taskType.findMany).toHaveBeenCalledWith({ where: { companyId: 'company-1' } });
    expect(prisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-type-1', companyId: 'company-1' },
    });
    expect(prisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { name: 'Mantenimiento', companyId: 'company-1' },
    });
  });

  it('writes tenant-scoped task-type changes', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);
    prisma.taskType.create.mockResolvedValue({ id: 'task-type-2' });
    prisma.taskType.update.mockResolvedValue({ id: 'task-type-2' });
    prisma.taskType.delete.mockResolvedValue({});

    await expect(
      repository.findByIdsForCompany(['task-1'], 'company-1'),
    ).resolves.toEqual([{ id: 'task-1' }]);
    await expect(
      repository.create({ companyId: 'company-1', name: 'Mantenimiento' }),
    ).resolves.toEqual({ id: 'task-type-2' });
    await expect(
      repository.updateForCompany('task-type-2', 'company-1', { name: 'Nuevo nombre' }),
    ).resolves.toEqual({ id: 'task-type-2' });
    await expect(repository.deleteForCompany('task-type-2', 'company-1')).resolves.toBeUndefined();

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['task-1'] }, taskType: { companyId: 'company-1' } },
      select: { id: true },
    });
    expect(prisma.taskType.create).toHaveBeenCalledWith({
      data: { companyId: 'company-1', name: 'Mantenimiento' },
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
