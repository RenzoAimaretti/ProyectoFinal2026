import { PrismaMachineReportRepository } from './prisma-machine-report.repository';

describe('PrismaMachineReportRepository tenant boundaries', () => {
  const prisma = {
    userCompany: { findMany: jest.fn() },
    machineActivity: { groupBy: jest.fn() },
    machine: { findMany: jest.fn() },
    machineUsage: { groupBy: jest.fn() },
  };
  const repository = new PrismaMachineReportRepository(prisma as any);
  beforeEach(() => jest.resetAllMocks());

  it('resolves active memberships through the user and company tenant', async () => {
    prisma.userCompany.findMany.mockResolvedValue([{ company: { id: 'a', name: 'A' } }]);
    expect(await repository.memberships('u', 't')).toEqual([{ id: 'a', name: 'A' }]);
    expect(prisma.userCompany.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u', active: true, user: { tenantId: 't', active: true, deleted: false }, company: { tenantId: 't', deleted: false } },
    }));
  });

  it('scopes activity and usage aggregation to authorized company ids and tenant', async () => {
    prisma.machineActivity.groupBy.mockResolvedValue([{ companyId: 'a', type: 'COMBUSTIBLE', fuelMovement: null, _sum: { liters: 12, cost: null } }]);
    prisma.machine.findMany.mockResolvedValue([{ id: 'm', companyId: 'a' }]);
    prisma.machineUsage.groupBy.mockResolvedValue([{ machineId: 'm', _sum: { usageHours: 2, hectares: 4 } }]);
    expect(await repository.activityTotals('t', ['a'])).toEqual([{ companyId: 'a', type: 'COMBUSTIBLE', fuelMovement: null, liters: 12, cost: 0 }]);
    expect(await repository.usageTotals('t', ['a'])).toEqual([{ companyId: 'a', usageHours: 2, hectares: 4 }]);
    expect(prisma.machineActivity.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: { in: ['a'] }, company: { tenantId: 't' }, machine: { companyId: { in: ['a'] }, company: { tenantId: 't' } } } }));
    expect(prisma.machine.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: { in: ['a'] }, company: { tenantId: 't' } } }));
    expect(prisma.machineUsage.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { machineId: { in: ['m'] }, machine: { companyId: { in: ['a'] }, company: { tenantId: 't' } } } }));
  });

  it('does not issue unbounded metric queries for empty company lists', async () => {
    expect(await repository.activityTotals('t', [])).toEqual([]);
    expect(await repository.usageTotals('t', [])).toEqual([]);
    expect(prisma.machineActivity.groupBy).not.toHaveBeenCalled();
    expect(prisma.machineUsage.groupBy).not.toHaveBeenCalled();
  });
});
