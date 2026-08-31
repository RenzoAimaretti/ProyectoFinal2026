import { PrismaTaskRepository } from './prisma-task.repository';

describe('PrismaTaskRepository', () => {
  const prisma = {
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const repository: any = new PrismaTaskRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list and reads through lot/farm/company relations', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'task-1' },
    ]);
    await expect(repository.findByIdForCompany('task-1', 'company-1')).resolves.toEqual({
      id: 'task-1',
    });
    await expect(repository.findByIdWithOperatorsForCompany('task-1', 'company-1')).resolves.toEqual({
      id: 'task-1',
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { lot: { farm: { companyId: 'company-1' } } },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
      include: { operators: { select: { id: true } } },
    });
  });

  it('writes tenant-scoped task changes after validating the company', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1' });
    prisma.task.create.mockResolvedValue({ id: 'task-2' });
    prisma.task.update.mockResolvedValue({ id: 'task-1' });
    prisma.task.delete.mockResolvedValue({});

    await expect(
      repository.create({
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: new Date('2026-01-10'),
      }),
    ).resolves.toEqual({ id: 'task-2' });
    await expect(
      repository.updateForCompany('task-1', 'company-1', { status: 'EN_PROGRESO' }),
    ).resolves.toEqual({ id: 'task-1' });
    await expect(
      repository.addOperatorForCompany('task-1', 'company-1', 'user-1'),
    ).resolves.toBeUndefined();
    await expect(
      repository.removeOperatorForCompany('task-1', 'company-1', 'user-1'),
    ).resolves.toBeUndefined();
    await expect(repository.deleteForCompany('task-1', 'company-1')).resolves.toBeUndefined();

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: new Date('2026-01-10'),
      },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
      select: { id: true },
    });
    expect(prisma.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1' },
      data: { status: 'EN_PROGRESO' },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
      select: { id: true },
    });
    expect(prisma.task.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-1' },
      data: { operators: { connect: { id: 'user-1' } } },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(3, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
      select: { id: true },
    });
    expect(prisma.task.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'task-1' },
      data: { operators: { disconnect: { id: 'user-1' } } },
    });
    expect(prisma.task.findFirst).toHaveBeenNthCalledWith(4, {
      where: { id: 'task-1', lot: { farm: { companyId: 'company-1' } } },
      select: { id: true },
    });
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
  });
});
