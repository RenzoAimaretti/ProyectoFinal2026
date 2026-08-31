import { PrismaLivestockEventRepository } from './prisma-livestock-event.repository';

describe('PrismaLivestockEventRepository', () => {
  const prisma = {
    livestockEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const repository = new PrismaLivestockEventRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list/read/update/delete through livestock/company relations', async () => {
    prisma.livestockEvent.findMany.mockResolvedValue([{ id: 'event-1' }]);
    prisma.livestockEvent.findFirst.mockResolvedValue({ id: 'event-1' });
    prisma.livestockEvent.update.mockResolvedValue({ id: 'event-1' });
    prisma.livestockEvent.delete.mockResolvedValue({});

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'event-1' },
    ]);
    await expect(repository.findByIdForCompany('event-1', 'company-1')).resolves.toEqual({
      id: 'event-1',
    });
    await expect(
      repository.updateForCompany('event-1', 'company-1', { obs: 'Updated' }),
    ).resolves.toEqual({ id: 'event-1' });
    await expect(repository.deleteForCompany('event-1', 'company-1')).resolves.toBeUndefined();

    expect(prisma.livestockEvent.findMany).toHaveBeenCalledWith({
      where: { livestock: { companyId: 'company-1' } },
    });
    expect(prisma.livestockEvent.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'event-1', livestock: { companyId: 'company-1' } },
    });
    expect(prisma.livestockEvent.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'event-1', livestock: { companyId: 'company-1' } },
      select: { id: true },
    });
    expect(prisma.livestockEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { observations: 'Updated' },
    });
    expect(prisma.livestockEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
  });
});
