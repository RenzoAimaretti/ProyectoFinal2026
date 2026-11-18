import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MachineReportController } from './machine-report.controller';

describe('MachineReportController', () => {
  it('requires JWT and ADMIN role; forwards actor and tenant, not active company', async () => {
    const handler = MachineReportController.prototype.consolidated;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(new Reflector().get(ROLES_KEY, handler)).toEqual(['ADMIN']);
    const service = { consolidated: jest.fn().mockResolvedValue({ rows: [], totals: {} }) };
    const req = { user: { id: 'u', tenantId: 't', firmaId: 'active' } };
    await new MachineReportController(service as any).consolidated(req);
    expect(service.consolidated).toHaveBeenCalledWith('u', 't');
  });
});
