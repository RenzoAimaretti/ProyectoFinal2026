import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { MACHINE_REPORT_REPOSITORY } from '../src/entities/machine-report/application/machine-report.ports';
import { MachineReportModule } from '../src/entities/machine-report/machine-report.module';

describe('Consolidated machine report (HTTP)', () => {
  let app: INestApplication;
  const repository = {
    memberships: jest.fn(async () => [{ id: 'company-a', name: 'A' }]),
    activityTotals: jest.fn(async () => [{ companyId: 'company-a', type: 'COMBUSTIBLE', fuelMovement: null, liters: 12, cost: 0 }]),
    usageTotals: jest.fn(async () => []),
  };
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MachineReportModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(MACHINE_REPORT_REPOSITORY).useValue(repository)
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } } }) => {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer isolated-test') throw new UnauthorizedException();
          req.user = { id: 'admin-a', tenantId: 'tenant-a', firmaId: 'other', role: req.headers['x-test-role'] ?? 'ADMIN' };
          return true;
        },
      }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterEach(() => jest.clearAllMocks());
  afterAll(async () => { await app?.close(); });

  it('rejects unauthenticated and non-ADMIN requests; scopes ADMIN rows to membership', async () => {
    const server = app.getHttpServer();
    await request(server).get('/machine-reports/consolidated').expect(401);
    await request(server).get('/machine-reports/consolidated').set({ Authorization: 'Bearer isolated-test', 'x-test-role': 'SUPERVISOR' }).expect(403);
    expect(repository.memberships).not.toHaveBeenCalled();
    const response = await request(server).get('/machine-reports/consolidated').set('Authorization', 'Bearer isolated-test').expect(200);
    expect(response.body.rows).toEqual([{ companyId: 'company-a', companyName: 'A', fuelPurchasedLiters: 12, fuelConsumedLiters: 0, fuelBalanceLiters: 12, usageHours: 0, hectares: 0, maintenanceCost: 0, repairCost: 0 }]);
    expect(response.body.totals.fuelPurchasedLiters).toBe(12);
    expect(repository.memberships).toHaveBeenCalledWith('admin-a', 'tenant-a');
    expect(repository.activityTotals).toHaveBeenCalledWith('tenant-a', ['company-a']);
  });
});
