import { PrismaInputRepository } from './prisma-input.repository';

describe('PrismaInputRepository', () => {
  const prisma = {
    input: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const repository = new PrismaInputRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list, read and duplicate checks by tenantId', async () => {
    prisma.input.findMany.mockResolvedValue([{ id: 'input-1' }]);
    prisma.input.findFirst.mockResolvedValue({ id: 'input-1' });

    await expect(repository.findAllByTenantId('tenant-1')).resolves.toEqual([
      { id: 'input-1' },
    ]);
    await expect(
      repository.findByIdForTenant('input-1', 'tenant-1'),
    ).resolves.toEqual({ id: 'input-1' });
    await expect(
      repository.findByNameAndTenantId('Glifosato', 'tenant-1'),
    ).resolves.toEqual({ id: 'input-1' });

    expect(prisma.input.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
    expect(prisma.input.findFirst).toHaveBeenCalledWith({
      where: { id: 'input-1', tenantId: 'tenant-1' },
    });
    expect(prisma.input.findFirst).toHaveBeenCalledWith({
      where: { name: 'Glifosato', tenantId: 'tenant-1' },
    });
  });

  it('creates with the explicit tenant provided by the use case', async () => {
    prisma.input.create.mockResolvedValue({ id: 'input-2' });

    await expect(
      repository.create({
        tenantId: 'tenant-1',
        name: 'Glifosato',
        unit: 'L',
      }),
    ).resolves.toEqual({ id: 'input-2' });

    expect(prisma.input.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Glifosato',
        unit: 'L',
      },
    });
  });

  it('updates only after confirming the input belongs to the tenant', async () => {
    prisma.input.findFirst.mockResolvedValue({ id: 'input-1' });
    prisma.input.update.mockResolvedValue({ id: 'input-1' });

    await expect(
      repository.updateForTenant('input-1', 'tenant-1', { unit: 'kg' }),
    ).resolves.toEqual({ id: 'input-1' });

    expect(prisma.input.findFirst).toHaveBeenCalledWith({
      where: { id: 'input-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(prisma.input.update).toHaveBeenCalledWith({
      where: { id: 'input-1' },
      data: { unit: 'kg' },
    });
  });

  it('refuses to update an input outside the caller tenant', async () => {
    prisma.input.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateForTenant('input-1', 'tenant-2', { unit: 'kg' }),
    ).rejects.toThrow('Input with id input-1 not found for tenant tenant-2');

    expect(prisma.input.update).not.toHaveBeenCalled();
  });
});
