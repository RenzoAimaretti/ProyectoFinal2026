import { ConsolidatedReportUseCase } from './consolidated-report.use-case';
import { MachineReportRepositoryPort } from '../machine-report.ports';

describe('ConsolidatedReportUseCase', () => {
  const repository: jest.Mocked<MachineReportRepositoryPort> = {
    memberships: jest.fn(),
    activityTotals: jest.fn(),
    usageTotals: jest.fn(),
  };
  const useCase = new ConsolidatedReportUseCase(repository);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.memberships.mockResolvedValue([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    repository.activityTotals.mockResolvedValue([
      { companyId: 'a', type: 'COMBUSTIBLE', fuelMovement: null, liters: 10, cost: 0 },
      { companyId: 'a', type: 'COMBUSTIBLE', fuelMovement: 'CONSUMPTION', liters: 4, cost: 0 },
      { companyId: 'b', type: 'COMBUSTIBLE', fuelMovement: 'INCOME', liters: 8, cost: 0 },
      { companyId: 'a', type: 'MANTENIMIENTO', fuelMovement: null, liters: 0, cost: 3 },
      { companyId: 'b', type: 'REPARACION', fuelMovement: null, liters: 0, cost: 7 },
      { companyId: 'foreign', type: 'COMBUSTIBLE', fuelMovement: null, liters: 999, cost: 0 },
    ]);
    repository.usageTotals.mockResolvedValue([{ companyId: 'a', usageHours: 2, hectares: 5 }, { companyId: 'b', usageHours: 4, hectares: 6 }, { companyId: 'foreign', usageHours: 999, hectares: 999 }]);
  });

  it('only totals membership companies and counts historical NULL fuel as purchased', async () => {
    const result = await useCase.execute('admin', 'tenant');
    expect(repository.memberships).toHaveBeenCalledWith('admin', 'tenant');
    expect(repository.activityTotals).toHaveBeenCalledWith('tenant', ['a', 'b']);
    expect(repository.usageTotals).toHaveBeenCalledWith('tenant', ['a', 'b']);
    expect(result.rows).toEqual([
      { companyId: 'a', companyName: 'A', fuelPurchasedLiters: 10, fuelConsumedLiters: 4, fuelBalanceLiters: 6, usageHours: 2, hectares: 5, maintenanceCost: 3, repairCost: 0 },
      { companyId: 'b', companyName: 'B', fuelPurchasedLiters: 8, fuelConsumedLiters: 0, fuelBalanceLiters: 8, usageHours: 4, hectares: 6, maintenanceCost: 0, repairCost: 7 },
    ]);
    expect(result.totals).toEqual({ fuelPurchasedLiters: 18, fuelConsumedLiters: 4, fuelBalanceLiters: 14, usageHours: 6, hectares: 11, maintenanceCost: 3, repairCost: 7 });
  });

  it('does not query metrics when no membership exists', async () => {
    repository.memberships.mockResolvedValue([]);
    expect(await useCase.execute('admin', 'tenant')).toEqual({ rows: [], totals: { fuelPurchasedLiters: 0, fuelConsumedLiters: 0, fuelBalanceLiters: 0, usageHours: 0, hectares: 0, maintenanceCost: 0, repairCost: 0 } });
    expect(repository.activityTotals).not.toHaveBeenCalled();
    expect(repository.usageTotals).not.toHaveBeenCalled();
  });
});
