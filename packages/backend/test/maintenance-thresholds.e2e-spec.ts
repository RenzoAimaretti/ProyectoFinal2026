import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { MaintenanceThresholdModule } from '../src/entities/maintenance-threshold/maintenance-threshold.module';
import { ALERT_MACHINE_READER, ALERT_USAGE_READER, THRESHOLD_REPOSITORY } from '../src/entities/maintenance-threshold/application/threshold.ports';

describe('maintenance thresholds (HTTP)', () => {
  let app: INestApplication;
  const records = new Map<string, { id: string; companyId: string; machineType: string; hoursLimit: number | null; hectaresLimit: number | null }>();
  const key = (company: string, type: string) => `${company}:${type}`;
  const repository = {
    findAll: jest.fn(async (company: string) => [...records.values()].filter(row => row.companyId === company)),
    upsert: jest.fn(async (companyId: string, machineType: string, limits: { hoursLimit: number | null; hectaresLimit: number | null }) => {
      const row = { id: key(companyId, machineType), companyId, machineType, ...limits };
      records.set(key(companyId, machineType), row);
      return row;
    }),
    delete: jest.fn(async (company: string, type: string) => records.delete(key(company, type))),
  };
  const headers = (company = 'a', role = 'ADMIN') => ({ authorization: 'Bearer synthetic', 'x-test-company': company, 'x-test-role': role });
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MaintenanceThresholdModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(THRESHOLD_REPOSITORY).useValue(repository)
      .overrideProvider(ALERT_MACHINE_READER).useValue({ findAllByCompanyId: async (company: string) => [{ id: `${company}-machine`, companyId: company, type: 'Tractor', name: 'Tractor' }] })
      .overrideProvider(ALERT_USAGE_READER).useValue({ totalsForCompany: async (company: string) => [{ machineId: `${company}-machine`, usageHours: 5, hectares: 7 }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (ctx: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } } }) => {
        const req = ctx.switchToHttp().getRequest();
        if (req.headers.authorization !== 'Bearer synthetic') throw new UnauthorizedException();
        req.user = { firmaId: req.headers['x-test-company'], role: req.headers['x-test-role'] };
        return true;
      } }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  beforeEach(() => { records.clear(); jest.clearAllMocks(); });
  afterAll(async () => app?.close());

  it('enforces roles, firma scope, validation and reached alerts without foreign writes', async () => {
    const server = app.getHttpServer();
    await request(server).get('/maintenance-thresholds').expect(401);
    await request(server).put('/maintenance-thresholds/Tractor').set(headers('a', 'OPERARIO')).send({ hoursLimit: 5 }).expect(403);
    await request(server).put('/maintenance-thresholds/Tractor').set(headers()).send({}).expect(400);
    await request(server).put('/maintenance-thresholds/Tractor').set(headers()).send({ hoursLimit: 0 }).expect(400);
    expect(repository.upsert).not.toHaveBeenCalled();
    await request(server).put('/maintenance-thresholds/Tractor').set(headers()).send({ companyId: 'b', hoursLimit: 5, hectaresLimit: 7 }).expect(200);
    expect(records.has('b:Tractor')).toBe(false);
    await request(server).put('/maintenance-thresholds/Tractor').set(headers('b', 'SUPERVISOR')).send({ hoursLimit: 100 }).expect(403);
    await request(server).put('/maintenance-thresholds/Tractor').set(headers('b', 'ADMIN')).send({ hoursLimit: 100 }).expect(200);
    const list = await request(server).get('/maintenance-thresholds').set(headers('a', 'OPERARIO')).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].companyId).toBe('a');
    const alerts = await request(server).get('/machines/alerts').set(headers('a', 'OPERARIO')).expect(200);
    expect(alerts.body).toEqual([expect.objectContaining({ due: true, reasons: ['HOURS', 'HECTARES'], hoursLimit: 5, hectaresLimit: 7 })]);
    await request(server).delete('/maintenance-thresholds/Tractor').set(headers('b')).expect(200);
    expect(records.has('a:Tractor')).toBe(true);
    await request(server).delete('/maintenance-thresholds/Tractor').set(headers('a', 'OPERARIO')).expect(403);
    await request(server).delete('/maintenance-thresholds/Tractor').set(headers('a')).expect(200);
    const noConfig = await request(server).get('/machines/alerts').set(headers()).expect(200);
    expect(noConfig.body[0]).toMatchObject({ due: false, reasons: [], hoursLimit: null, hectaresLimit: null });
  });
});
