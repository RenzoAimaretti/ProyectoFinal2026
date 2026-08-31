import { PrismaLivestockMovementRepository } from './prisma-livestock-movement.repository';

describe('PrismaLivestockMovementRepository', () => {
  const prisma = {
    livestockMovement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const repository = new PrismaLivestockMovementRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list and reads through livestock and lot company relations', async () => {
    prisma.livestockMovement.findMany.mockResolvedValue([{ id: 'movement-1' }]);
    prisma.livestockMovement.findFirst.mockResolvedValue({ id: 'movement-1' });

    await expect(repository.findAllByCompanyId('company-1')).resolves.toEqual([
      { id: 'movement-1' },
    ]);
    await expect(repository.findByIdForCompany('movement-1', 'company-1')).resolves.toEqual({
      id: 'movement-1',
    });

    expect(prisma.livestockMovement.findMany).toHaveBeenCalledWith({
      where: {
        livestock: { companyId: 'company-1' },
        lot: { farm: { companyId: 'company-1' } },
      },
    });
    expect(prisma.livestockMovement.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'movement-1',
        livestock: { companyId: 'company-1' },
        lot: { farm: { companyId: 'company-1' } },
      },
    });
  });

  it('creates a movement record with normalized fields', async () => {
    prisma.livestockMovement.create.mockResolvedValue({ id: 'movement-1' });

    await expect(
      repository.create({
        livestockId: 'livestock-1',
        lotId: 'lot-1',
        movementDate: new Date('2026-01-12T00:00:00.000Z'),
        observations: 'Moved for grazing',
      }),
    ).resolves.toEqual({ id: 'movement-1' });

    expect(prisma.livestockMovement.create).toHaveBeenCalledWith({
      data: {
        livestockId: 'livestock-1',
        lotId: 'lot-1',
        movementDate: new Date('2026-01-12T00:00:00.000Z'),
        observations: 'Moved for grazing',
      },
    });
  });
});
