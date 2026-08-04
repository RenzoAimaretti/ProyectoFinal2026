import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// E2E del piloto hexagonal (T-F1-11, REQ-F1-10): happy paths de create/update/remove
// sobre /livestocks con PrismaService mockeado (mismo patrón que auth.e2e-spec.ts).
// Los adapters del módulo livestock (T-F1-05/06) reciben el mock y ejercitan el
// flujo service → port → adapter completo con la app real.
describe('LivestockController (e2e)', () => {
  let app: INestApplication;

  const testCompany = { id: '11111111-1111-4111-8111-111111111111' };

  const validBody = {
    companyId: testCompany.id,
    lotId: '22222222-2222-4222-8222-222222222222',
    tagNumber: 'E2E-001',
    breed: 'Angus',
    species: 'Bovino',
    birthDate: '2020-01-15T10:00:00.000Z',
    sex: 'Hembra',
  };

  const baseLivestock = {
    id: '33333333-3333-4333-8333-333333333333',
    companyId: validBody.companyId,
    lotId: validBody.lotId,
    tagNumber: validBody.tagNumber,
    species: validBody.species,
    breed: validBody.breed,
    sex: validBody.sex,
    birthDate: new Date(validBody.birthDate),
    status: 'ACTIVO',
    entryDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    version: 0,
    deleted: false,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        company: {
          findUnique: jest.fn().mockResolvedValue(testCompany),
        },
        lot: {
          findUnique: jest.fn().mockResolvedValue({
            id: validBody.lotId,
            farm: { companyId: testCompany.id },
          }),
        },
        livestock: {
          // findByIdWithLotFarm usa include; findByTagNumber usa where.tagNumber;
          // findById (delete) usa where.id sin include.
          findUnique: jest.fn().mockImplementation(({ where, include }) => {
            if (include) {
              return Promise.resolve({
                ...baseLivestock,
                lot: { farm: { companyId: testCompany.id } },
              });
            }
            if (where.tagNumber) {
              return Promise.resolve(null);
            }
            return Promise.resolve(baseLivestock);
          }),
          // findByTagNumberExcluding (update): sin duplicados
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({ ...baseLivestock, ...data, id: baseLivestock.id }),
          ),
          update: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({ ...baseLivestock, ...data }),
          ),
          delete: jest.fn().mockResolvedValue(baseLivestock),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /livestocks', () => {
    it('debería crear un livestock con body válido y responder 201 (SC-LV-02 happy path)', async () => {
      const res = await request(app.getHttpServer())
        .post('/livestocks')
        .send(validBody)
        .expect(201);

      expect(res.body.id).toBe(baseLivestock.id);
      expect(res.body.companyId).toBe(validBody.companyId);
      expect(res.body.tagNumber).toBe(validBody.tagNumber);
      expect(res.body.status).toBe('ACTIVO');
    });

    it('debería rechazar con 400 si falta un campo requerido', async () => {
      const res = await request(app.getHttpServer())
        .post('/livestocks')
        .send({ ...validBody, species: '' })
        .expect(400);

      expect(res.body.message).toContain('species is required');
    });
  });

  describe('PUT /livestocks/:id', () => {
    it('debería actualizar solo el tagNumber y responder 200 (SC-LV-08 happy path)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/livestocks/${baseLivestock.id}`)
        .send({ tagNumber: 'E2E-002' })
        .expect(200);

      expect(res.body.id).toBe(baseLivestock.id);
      expect(res.body.tagNumber).toBe('E2E-002');
    });
  });

  describe('DELETE /livestocks/:id', () => {
    it('debería eliminar y responder 200 con mensaje (REQ-C-01)', async () => {
      await request(app.getHttpServer())
        .delete(`/livestocks/${baseLivestock.id}`)
        .expect(200)
        .expect({ message: `Livestock with id ${baseLivestock.id} deleted successfully` });
    });
  });
});
