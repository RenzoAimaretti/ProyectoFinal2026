import { ListMachineAlertsUseCase } from './use-cases/list-machine-alerts.use-case';
import { UpsertThresholdUseCase } from './use-cases/upsert-threshold.use-case';
import { DeleteThresholdUseCase } from './use-cases/delete-threshold.use-case';
import { MaintenanceThresholdController, MachineAlertsController } from '../maintenance-threshold.controller';
import { CreateMachineUseCase } from '../../machine/application/use-cases/create-machine.use-case';
import { UpdateMachineUseCase } from '../../machine/application/use-cases/update-machine.use-case';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

const thresholds = {
  findAll: jest.fn(), find: jest.fn(), upsert: jest.fn(), delete: jest.fn(),
};
const machines = { findAllByCompanyId: jest.fn() };
const usages = { totalsForCompany: jest.fn() };

describe('maintenance thresholds and machine alerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects empty or invalid limits without writing', async () => {
    const useCase = new UpsertThresholdUseCase(thresholds as never);
    for (const body of [{}, { hoursLimit: 0 }, { hectaresLimit: -2 }, { hoursLimit: null, hectaresLimit: null }, { hoursLimit: '2' }]) {
      expect(() => useCase.execute('company-a', 'Tractor', body)).toThrow();
    }
    expect(thresholds.upsert).not.toHaveBeenCalled();
  });

  it('scopes writes and deletes to the firma', async () => {
    const upsert = new UpsertThresholdUseCase(thresholds as never);
    thresholds.upsert.mockResolvedValue({ companyId: 'company-a', machineType: 'Tractor', hoursLimit: 5 });
    await upsert.execute('company-a', 'Tractor', { hoursLimit: 5 });
    expect(thresholds.upsert).toHaveBeenCalledWith('company-a', 'Tractor', { hoursLimit: 5, hectaresLimit: null });
    thresholds.delete.mockResolvedValue(false);
    await expect(new DeleteThresholdUseCase(thresholds as never).execute('company-b', 'Tractor')).rejects.toThrow();
    expect(thresholds.delete).toHaveBeenCalledWith('company-b', 'Tractor');
  });

  it('evaluates zero, hours, hectares and both; excludes foreign machines and thresholds', async () => {
    machines.findAllByCompanyId.mockResolvedValue([
      { id: 'none', companyId: 'a', type: null },
      { id: 'unconfigured', companyId: 'a', type: 'Other' },
      { id: 'hours', companyId: 'a', type: 'H' },
      { id: 'hectares', companyId: 'a', type: 'Ha' },
      { id: 'both', companyId: 'a', type: 'Both' },
    ]);
    thresholds.findAll.mockResolvedValue([
      { companyId: 'a', machineType: 'H', hoursLimit: 5, hectaresLimit: null },
      { companyId: 'a', machineType: 'Ha', hoursLimit: null, hectaresLimit: 7 },
      { companyId: 'a', machineType: 'Both', hoursLimit: 5, hectaresLimit: 7 },
      { companyId: 'b', machineType: 'Other', hoursLimit: 1, hectaresLimit: 1 },
    ]);
    usages.totalsForCompany.mockResolvedValue([
      { machineId: 'none', usageHours: 8, hectares: 9 },
      { machineId: 'unconfigured', usageHours: 8, hectares: 9 },
      { machineId: 'hours', usageHours: 5, hectares: 1 },
      { machineId: 'hectares', usageHours: 1, hectares: 7 },
      { machineId: 'both', usageHours: 5, hectares: 7 },
      { machineId: 'foreign', usageHours: 100, hectares: 100 },
    ]);
    const rows = await new ListMachineAlertsUseCase(machines as never, thresholds as never, usages as never).execute('a');
    expect(rows.map(row => [row.due, row.reasons])).toEqual([
      [false, []], [false, []], [true, ['HOURS']], [true, ['HECTARES']], [true, ['HOURS', 'HECTARES']],
    ]);
    expect(rows[1]).toMatchObject({ hoursLimit: null, hectaresLimit: null });
    expect(rows).toHaveLength(5);
    expect(machines.findAllByCompanyId).toHaveBeenCalledWith('a');
    expect(thresholds.findAll).toHaveBeenCalledWith('a');
    expect(usages.totalsForCompany).toHaveBeenCalledWith('a');
  });

  it('matches machine types ignoring case and surrounding spaces', async () => {
    machines.findAllByCompanyId.mockResolvedValue([
      { id: 'm1', companyId: 'a', type: ' tractor ' },
      { id: 'm2', companyId: 'a', type: 'Pulverizadora' },
    ]);
    thresholds.findAll.mockResolvedValue([
      { companyId: 'a', machineType: 'Tractor', hoursLimit: 5, hectaresLimit: null },
      { companyId: 'a', machineType: 'pulverizadora', hoursLimit: null, hectaresLimit: 2 },
    ]);
    usages.totalsForCompany.mockResolvedValue([
      { machineId: 'm1', usageHours: 6, hectares: 0 },
      { machineId: 'm2', usageHours: 0, hectares: 3 },
    ]);

    const rows = await new ListMachineAlertsUseCase(machines as never, thresholds as never, usages as never).execute('a');

    expect(rows.map(row => [row.id, row.due, row.reasons])).toEqual([
      ['m1', true, ['HOURS']],
      ['m2', true, ['HECTARES']],
    ]);
  });

  it('accepts optional free-text machine types and permits clearing them', async () => {
    const repo = { create: jest.fn(async (data: unknown) => data), findByIdForCompany: jest.fn(async () => ({ id: 'm', type: 'Tractor' })), updateForCompany: jest.fn(async (_id: string, _company: string, data: unknown) => data) };
    const create = new CreateMachineUseCase(repo as never, { findById: async () => ({ id: 'a' }) });
    await create.execute('a', { name: 'M', brand: 'B', entryDate: '2026-01-01', type: ' Cosechadora ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'a', type: 'Cosechadora' }));
    const update = new UpdateMachineUseCase(repo as never);
    await update.execute('m', 'a', { type: null });
    expect(repo.updateForCompany).toHaveBeenCalledWith('m', 'a', { type: null });
    await expect(create.execute('a', { name: 'M', brand: 'B', entryDate: '2026-01-01', type: '  ' })).rejects.toThrow();
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('guards read and write routes with the correct roles', () => {
    for (const [controller, methods, roles] of [
      [MaintenanceThresholdController, ['findAll'], ['ADMIN', 'SUPERVISOR', 'OPERARIO']],
      [MaintenanceThresholdController, ['upsert', 'remove'], ['ADMIN']],
      [MachineAlertsController, ['findAll'], ['ADMIN', 'SUPERVISOR', 'OPERARIO']],
    ] as const) {
      for (const method of methods) {
        const handler = controller.prototype[method as keyof typeof controller.prototype];
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(roles);
      }
    }
  });
});
