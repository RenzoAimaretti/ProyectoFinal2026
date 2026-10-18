import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { MACHINE_READER, MACHINE_USAGE_REPOSITORY, TASK_READER, USER_READER } from '../src/entities/machine-usage/application/machine-usage.ports';
import { MachineUsageModule } from '../src/entities/machine-usage/machine-usage.module';
import { MACHINE_ACTIVITY_REPOSITORY, MACHINE_ACTIVITY_MACHINE_READER } from '../src/entities/machine-activity/application/machine-activity.ports';
import { MachineActivityModule } from '../src/entities/machine-activity/machine-activity.module';

describe('Task-linked machine usage (HTTP)', () => {
  let app: INestApplication;
  let usage: Record<string, unknown> | null;
  const repository = {
    create: jest.fn(async (data: Record<string, unknown>) => {
      usage = { id: 'usage-a', ...data };
      return usage;
    }),
    updateForCompany: jest.fn(async (_id: string, _company: string, data: Record<string, unknown>) => {
      usage = { ...usage, ...data };
      return usage;
    }),
    findByIdForCompany: jest.fn(async (_id: string, company: string) => company === 'company-a' ? usage : null),
    findAllByCompanyId: jest.fn(async (company: string) => company === 'company-a' && usage ? [usage] : []),
  };
  const activityRepository = {
    create: jest.fn(),
    findByIdForCompany: jest.fn(),
    findAllByCompany: jest.fn(async (company: string) => company === 'company-a'
      ? [{ id: 'legacy-a', machineId: 'machine-a', companyId: 'company-a', type: 'USO_CAMPO', usageHours: 3, hectares: 5 }]
      : []),
    attachReceiptIfAbsent: jest.fn(),
    findReceiptForCompany: jest.fn(),
  };
  const asCompany = (company = 'company-a') => ({ Authorization: 'Bearer isolated-test', 'x-test-company': company });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MachineUsageModule, MachineActivityModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(MACHINE_USAGE_REPOSITORY).useValue(repository)
      .overrideProvider(MACHINE_READER).useValue({ findById: jest.fn(async () => ({ id: 'machine-a', status: 'ACTIVA' })), findByIdForCompany: jest.fn(async (_id: string, company: string) => company === 'company-a' ? { id: 'machine-a', status: 'ACTIVA' } : null) })
      .overrideProvider(TASK_READER).useValue({ findByIdWithOperators: jest.fn(async () => ({ id: 'task-a', operators: [{ id: 'operator-a' }] })), findByIdWithOperatorsForCompany: jest.fn(async (_id: string, company: string) => company === 'company-a' ? { id: 'task-a', operators: [{ id: 'operator-a' }] } : null) })
      .overrideProvider(USER_READER).useValue({ findById: jest.fn(async () => ({ id: 'operator-a' })), findByIdForCompany: jest.fn(async (_id: string, company: string) => company === 'company-a' ? { id: 'operator-a' } : null) })
      .overrideProvider(MACHINE_ACTIVITY_REPOSITORY).useValue(activityRepository)
      .overrideProvider(MACHINE_ACTIVITY_MACHINE_READER).useValue({ findByIdForCompany: jest.fn(async () => ({ id: 'machine-a' })) })
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } } }) => {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer isolated-test') throw new UnauthorizedException();
          req.user = { firmaId: req.headers['x-test-company'], role: 'ADMIN' };
          return true;
        },
      }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  beforeEach(() => { usage = null; jest.clearAllMocks(); });
  afterAll(async () => { await app?.close(); });

  it('accepts scoped task metrics and keeps independent historical activity read-only', async () => {
    const server = app.getHttpServer();
    await request(server).post('/machine-usages').send({ machineId: 'machine-a', taskId: 'task-a', operatorId: 'operator-a', usageHours: 2, hectares: 7 }).expect(401);
    await request(server).post('/machine-usages').set(asCompany('company-b')).send({ machineId: 'machine-a', taskId: 'task-a', operatorId: 'operator-a', usageHours: 2, hectares: 7 }).expect(400);
    await request(server).post('/machine-usages').set(asCompany()).send({ machineId: 'machine-a', taskId: 'task-a', operatorId: 'operator-a', hectares: -1 }).expect(400);
    expect(repository.create).not.toHaveBeenCalled();

    const created = await request(server).post('/machine-usages').set(asCompany()).send({ machineId: 'machine-a', taskId: 'task-a', operatorId: 'operator-a', usageHours: 2, hectares: 7 }).expect(201);
    expect(created.body).toEqual(expect.objectContaining({ taskId: 'task-a', machineId: 'machine-a', usageHours: 2, hectares: 7 }));
    await request(server).put('/machine-usages/usage-a').set(asCompany('company-b')).send({ hectares: 9 }).expect(404);
    expect(repository.updateForCompany).not.toHaveBeenCalled();
    const updated = await request(server).put('/machine-usages/usage-a').set(asCompany()).send({ hectares: 9 }).expect(200);
    expect(updated.body.hectares).toBe(9);
    expect(repository.updateForCompany).toHaveBeenCalledWith('usage-a', 'company-a', { hectares: 9 });

    await request(server).post('/machine-activities').set(asCompany()).send({ machineId: 'machine-a', type: 'USO_CAMPO', date: '2026-03-09T08:00:00.000Z', usageHours: 2, hectares: 9 }).expect(400);
    expect(activityRepository.create).not.toHaveBeenCalled();
    const historical = await request(server).get('/machine-activities').set(asCompany()).expect(200);
    expect(historical.body).toEqual([expect.objectContaining({ id: 'legacy-a', type: 'USO_CAMPO', usageHours: 3, hectares: 5 })]);
  });
});
