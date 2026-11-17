import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { MachineActivityModule } from '../src/entities/machine-activity/machine-activity.module';
import { FUEL_RECEIPT_STORAGE, MACHINE_ACTIVITY_REPOSITORY } from '../src/entities/machine-activity/application/machine-activity.ports';
import { PrismaService } from '../src/prisma/prisma.service';

const pdf = Buffer.from('%PDF-1.4\nreceipt\n%%EOF');
const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString('base64')}`;

describe('Fuel receipts (HTTP)', () => {
  let app: INestApplication;
  let attached: { key: string; mimeType: string } | null;
  const stored = new Map<string, Buffer>();
  const repository = {
    create: jest.fn(),
    findAllByCompany: jest.fn().mockResolvedValue([]),
    findByIdForCompany: jest.fn(async (id: string, companyId: string) =>
      companyId === 'company-a' && ['fuel-a', 'fuel-b'].includes(id)
        ? { id, companyId, type: 'COMBUSTIBLE', hasReceipt: id === 'fuel-a' && Boolean(attached) }
        : null),
    attachReceiptIfAbsent: jest.fn(async (id: string, companyId: string, key: string, mimeType: string) => {
      if (id !== 'fuel-a' || companyId !== 'company-a' || attached) return false;
      attached = { key, mimeType };
      return true;
    }),
    findReceiptForCompany: jest.fn(async (id: string, companyId: string) =>
      id === 'fuel-a' && companyId === 'company-a' ? attached : null),
  };
  const storage = {
    write: jest.fn(async (bytes: Buffer) => {
      const key = `receipt-${stored.size + 1}`;
      stored.set(key, bytes);
      return key;
    }),
    read: jest.fn(async (key: string) => stored.get(key) ?? Buffer.alloc(0)),
    remove: jest.fn(async (key: string) => { stored.delete(key); }),
  };
  const asCompany = (company = 'company-a') => ({ Authorization: 'Bearer isolated-test', 'x-test-company': company });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MachineActivityModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(MACHINE_ACTIVITY_REPOSITORY).useValue(repository)
      .overrideProvider(FUEL_RECEIPT_STORAGE).useValue(storage)
      .overrideGuard(JwtAuthGuard).useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: unknown } } }) => {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer isolated-test') throw new UnauthorizedException();
          req.user = { firmaId: req.headers['x-test-company'], role: 'OPERARIO' };
          return true;
        },
      }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    attached = null;
    stored.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => { await app?.close(); });

  it('keeps rejected requests unchanged and allows exactly one scoped upload and download', async () => {
    const server = app.getHttpServer();
    await request(server).post('/machine-activities/fuel-a/receipt').send({ dataUrl: dataUrl('application/pdf', pdf) }).expect(401);
    await request(server).post('/machine-activities/fuel-a/receipt').set(asCompany('company-b')).send({ dataUrl: dataUrl('application/pdf', pdf) }).expect(404);
    await request(server).post('/machine-activities/fuel-a/receipt').set(asCompany()).send({ dataUrl: dataUrl('image/png', pdf) }).expect(400);
    expect(repository.attachReceiptIfAbsent).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(stored.size).toBe(0);

    const added = await request(server).post('/machine-activities/fuel-a/receipt').set(asCompany()).send({ dataUrl: dataUrl('application/pdf', pdf) }).expect(201);
    expect(added.body).toEqual({ attached: true });
    expect(stored.size).toBe(1);
    const first = attached;
    await request(server).post('/machine-activities/fuel-a/receipt').set(asCompany()).send({ dataUrl: dataUrl('application/pdf', pdf) }).expect(409);
    expect(attached).toEqual(first);
    expect(storage.write).toHaveBeenCalledTimes(1);
    expect(stored.size).toBe(1);

    await request(server).get('/machine-activities/fuel-a/receipt').expect(401);
    await request(server).get('/machine-activities/fuel-a/receipt').set(asCompany('company-b')).expect(404);
    expect(storage.read).not.toHaveBeenCalled();
    const downloaded = await request(server).get('/machine-activities/fuel-a/receipt').set(asCompany()).expect(200);
    expect(downloaded.body).toEqual(pdf);
    expect(downloaded.headers['content-type']).toMatch(/^application\/pdf/);
    expect(downloaded.headers['cache-control']).toBe('private, no-store');
    expect(downloaded.headers['x-content-type-options']).toBe('nosniff');
  });
});
