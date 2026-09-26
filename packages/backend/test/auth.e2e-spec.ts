import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '../prisma/generated/client';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testTenant = {
    id: 'e2e-tenant-1',
    name: 'Grupo E2E Test',
  };

  const testCompany = {
    id: 'e2e-company-1',
    tenantId: testTenant.id,
    name: 'Firma E2E Test',
    cuit: '30-99999999-9',
  };

  const testUser = {
    id: 'e2e-user-1',
    tenantId: testTenant.id,
    companyId: testCompany.id,
    email: 'e2e-user@firma.com',
    password: 'SecurePassword123!',
    passwordHash: '',
    role: UserRole.ADMIN,
  };

  type TestUserRow = {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    tenantId: string;
    active: boolean;
    deleted: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    companyMemberships: { companyId: string; role: UserRole }[];
  };

  // Shape returned by the auth outbound adapters (user + active membership).
  let testUserRow: TestUserRow;

  let refreshToken: string;

  beforeAll(async () => {
    testUser.passwordHash = await argon2.hash(testUser.password);

    testUserRow = {
      id: testUser.id,
      email: testUser.email,
      passwordHash: testUser.passwordHash,
      role: testUser.role,
      tenantId: testUser.tenantId,
      active: true,
      deleted: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      companyMemberships: [{ companyId: testCompany.id, role: testUser.role }],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        company: {
          findUnique: jest.fn().mockResolvedValue(testCompany),
        },
        user: {
          findUnique: jest.fn().mockImplementation(({ where }) => {
            if (where.email === testUser.email) {
              return Promise.resolve(testUserRow);
            }
            return Promise.resolve(null);
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        refreshToken: {
          create: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockImplementation(() => {
            return Promise.resolve([
              {
                id: 'e2e-rt-1',
                tokenHash: testUser.passwordHash, // dummy hash matching
                expiresAt: new Date(Date.now() + 1000000),
                revokedAt: null,
                user: testUserRow,
              },
            ]);
          }),
          update: jest.fn().mockResolvedValue({}),
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

  describe('POST /auth/login', () => {
    it('debería retornar 401 si las credenciales son incorrectas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Usuario o contraseña incorrectos');
        });
    });

    it('debería responder con HTTP 200, accessToken, refreshToken y objeto user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        tenantId: testUser.tenantId,
        firmaId: testUser.companyId,
      });

      refreshToken = res.body.refreshToken;
    });

    it('debería rechazar si el email no es válido o no existe', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('debería rechazar si no se envía refreshToken', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('debería responder HTTP 200 al cerrar sesión', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'some-token' })
        .expect(200)
        .expect({ message: 'Sesión cerrada correctamente' });
    });
  });
});
