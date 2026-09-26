import { PrismaCompanyRepository } from './prisma-company.repository';

describe('PrismaCompanyRepository', () => {
  const prisma = {
    company: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const repository: any = new PrismaCompanyRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes list and reads by tenantId', async () => {
    prisma.company.findMany.mockResolvedValue([{ id: 'company-1' }]);
    prisma.company.findFirst.mockResolvedValue({ id: 'company-1' });

    await expect(repository.findAllByTenantId('tenant-1')).resolves.toEqual([
      { id: 'company-1' },
    ]);
    await expect(
      repository.findByIdForTenant('company-1', 'tenant-1'),
    ).resolves.toEqual({ id: 'company-1' });

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
    });
    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-1', tenantId: 'tenant-1' },
      include: { modules: true },
    });
  });

  it('updates only after confirming the company belongs to the tenant', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'company-1' });
    prisma.company.update.mockResolvedValue({ id: 'company-1' });

    await expect(
      repository.updateForTenant('company-1', 'tenant-1', { name: 'New name' }),
    ).resolves.toEqual({ id: 'company-1' });

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: { name: 'New name' },
    });
  });

  it('refuses to update a company outside the caller tenant', async () => {
    prisma.company.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateForTenant('company-2', 'tenant-1', { name: 'New name' }),
    ).rejects.toThrow(
      'Company with id company-2 not found for tenant tenant-1',
    );

    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('links a module only after confirming the company belongs to the tenant', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'company-1' });
    prisma.company.update.mockResolvedValue({ id: 'company-1' });

    await expect(
      repository.addModuleForTenant('company-1', 'tenant-1', 'module-1'),
    ).resolves.toBeUndefined();

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-1', tenantId: 'tenant-1' },
      select: { id: true },
    });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: { modules: { connect: { id: 'module-1' } } },
    });
  });

  it('refuses to link a module to a company outside the caller tenant', async () => {
    prisma.company.findFirst.mockResolvedValue(null);

    await expect(
      repository.addModuleForTenant('company-2', 'tenant-1', 'module-1'),
    ).rejects.toThrow(
      'Company with id company-2 not found for tenant tenant-1',
    );

    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('creates with the explicit tenant provided by the use case', async () => {
    prisma.company.create.mockResolvedValue({ id: 'company-1' });

    await expect(
      repository.create({
        tenantId: 'tenant-1',
        name: 'Agrolify SA',
        cuit: '30-12345678-9',
      }),
    ).resolves.toEqual({ id: 'company-1' });

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Agrolify SA',
        cuit: '30-12345678-9',
      },
    });
  });
});
