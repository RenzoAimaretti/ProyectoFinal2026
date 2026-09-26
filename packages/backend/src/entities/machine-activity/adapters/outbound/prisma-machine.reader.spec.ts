import { PrismaMachineReader } from './prisma-machine.reader';

describe('PrismaMachineReader', () => {
  const prisma = {
    machine: { findFirst: jest.fn() },
  };

  const reader = new PrismaMachineReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the machine only when it belongs to the company', async () => {
    prisma.machine.findFirst.mockResolvedValue({ id: 'machine-1' });

    await expect(
      reader.findByIdForCompany('machine-1', 'company-1'),
    ).resolves.toEqual({ id: 'machine-1' });

    expect(prisma.machine.findFirst).toHaveBeenCalledWith({
      where: { id: 'machine-1', companyId: 'company-1' },
      select: { id: true },
    });
  });

  it('returns null when the machine belongs to another company', async () => {
    prisma.machine.findFirst.mockResolvedValue(null);

    await expect(
      reader.findByIdForCompany('machine-1', 'company-2'),
    ).resolves.toBeNull();
  });
});
