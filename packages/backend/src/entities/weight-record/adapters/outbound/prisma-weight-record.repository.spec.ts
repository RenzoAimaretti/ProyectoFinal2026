import { PrismaWeightRecordRepository } from './prisma-weight-record.repository';

describe('PrismaWeightRecordRepository', () => {
  const prisma = {
    weightRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const repository = new PrismaWeightRecordRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list/read/update/delete through livestock/company relations', async () => {
    prisma.weightRecord.findMany.mockResolvedValue([{ id: 'weight-1' }]);
    prisma.weightRecord.findFirst.mockResolvedValue({ id: 'weight-1' });
    prisma.weightRecord.update.mockResolvedValue({ id: 'weight-1' });
    prisma.weightRecord.delete.mockResolvedValue({});

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'weight-1' },
    ]);
    await expect(repository.findByIdForCompany('weight-1', 'company-1')).resolves.toEqual({
      id: 'weight-1',
    });
    await expect(
      repository.updateForCompany('weight-1', 'company-1', { weight: 420 }),
    ).resolves.toEqual({ id: 'weight-1' });
    await expect(repository.deleteForCompany('weight-1', 'company-1')).resolves.toBeUndefined();

    expect(prisma.weightRecord.findMany).toHaveBeenCalledWith({
      where: { livestock: { companyId: 'company-1' } },
    });
    expect(prisma.weightRecord.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'weight-1', livestock: { companyId: 'company-1' } },
    });
    expect(prisma.weightRecord.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'weight-1', livestock: { companyId: 'company-1' } },
      select: { id: true },
    });
    expect(prisma.weightRecord.update).toHaveBeenCalledWith({
      where: { id: 'weight-1' },
      data: { weight: 420 },
    });
    expect(prisma.weightRecord.delete).toHaveBeenCalledWith({ where: { id: 'weight-1' } });
  });
});
