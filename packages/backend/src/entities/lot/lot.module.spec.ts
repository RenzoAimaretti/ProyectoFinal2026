import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CLIENT_USER_READER } from '../client/application/client.ports';
import { LOT_HISTORY_READER, LOT_REPOSITORY } from './application/lot.ports';
import type { LotHistoryReaderPort } from './application/lot.ports';
import type { LotRepositoryPort } from './application/lot.ports';
import type { LotRecord } from './application/lot.types';
import { LotModule } from './lot.module';
import { LotHasRelationsError } from './domain/errors';
import { LotService } from './lot.service';

const baseLot: LotRecord = {
  id: 'lot-1',
  farmId: 'farm-1',
  name: 'North pasture',
  coords: null,
  polygon: null,
  area: 12.5,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

async function compileLotModule(authenticatedRole?: string) {
  const repository: jest.Mocked<LotRepositoryPort> = {
    findAllByTenantId: jest.fn().mockResolvedValue([]),
    findAllByClientId: jest.fn().mockResolvedValue([]),
    findByIdForTenant: jest.fn().mockResolvedValue(null),
    findByNameAndFarmId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateForTenant: jest.fn(),
    deleteForTenant: jest.fn(),
  };

  const historyReader: jest.Mocked<LotHistoryReaderPort> = {
    findHistoryByLotIds: jest.fn().mockResolvedValue(new Map()),
  };

  const clientUserReader = {
    findClientIdByUserId: jest.fn().mockResolvedValue(null),
  };

  const builder = Test.createTestingModule({ imports: [LotModule] });
  if (authenticatedRole) {
    builder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (context: { switchToHttp: () => { getRequest: () => { user: unknown } } }) => {
        context.switchToHttp().getRequest().user = {
          id: 'user-1', tenantId: 'tenant-1', role: authenticatedRole,
        };
        return true;
      },
    });
  }
  const moduleRef = await builder
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(LOT_REPOSITORY)
    .useValue(repository)
    .overrideProvider(LOT_HISTORY_READER)
    .useValue(historyReader)
    .overrideProvider(CLIENT_USER_READER)
    .useValue(clientUserReader)
    .compile();

  return { moduleRef, repository, historyReader, clientUserReader };
}

describe('LotModule', () => {
  describe('DELETE /lots/:id over HTTP', () => {
    let app: INestApplication;
    let repository: jest.Mocked<LotRepositoryPort>;
    beforeEach(async () => {
      const compiled = await compileLotModule('ADMIN');
      repository = compiled.repository;
      app = compiled.moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('returns 404 for missing or cross-tenant lots without writes', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);
      const response = await request(app.getHttpServer()).delete('/lots/lot-1');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Lot with id lot-1 not found', error: 'Not Found', statusCode: 404 });
      expect(repository.deleteForTenant).toHaveBeenCalledWith('lot-1', 'tenant-1');
    });

    it('returns 409 for a referenced lot without deleting its associated records', async () => {
      repository.deleteForTenant.mockRejectedValue(new LotHasRelationsError('lot-1'));
      const response = await request(app.getHttpServer()).delete('/lots/lot-1');
      expect(response.status).toBe(409);
      expect(response.body).toEqual({ message: 'Lot with id lot-1 has related records', error: 'Conflict', statusCode: 409 });
      expect(repository.deleteForTenant).toHaveBeenCalledWith('lot-1', 'tenant-1');
    });

    it('returns 204 after deleting an unreferenced lot', async () => {
      repository.deleteForTenant.mockResolvedValue(true);
      await request(app.getHttpServer()).delete('/lots/lot-1').expect(204);
      expect(repository.deleteForTenant).toHaveBeenCalledWith('lot-1', 'tenant-1');
    });

    it('returns 403 for read-only roles without touching the repository', async () => {
      const compiled = await compileLotModule('PRODUCTOR');
      const readOnlyApp = compiled.moduleRef.createNestApplication();
      try {
        await readOnlyApp.init();
        const response = await request(readOnlyApp.getHttpServer()).delete('/lots/lot-1');
        expect(response.status).toBe(403);
        expect(compiled.repository.deleteForTenant).not.toHaveBeenCalled();
      } finally {
        await readOnlyApp.close();
      }
    });
  });
  it('resolves the lot service from the module graph', async () => {
    const { moduleRef } = await compileLotModule();

    expect(moduleRef.get(LotService)).toBeInstanceOf(LotService);
  });

  it('reaches the history port and returns lots carrying their derived state', async () => {
    const { moduleRef, repository, historyReader } = await compileLotModule();
    repository.findAllByTenantId.mockResolvedValue([baseLot]);
    historyReader.findHistoryByLotIds.mockResolvedValue(
      new Map([
        [
          'lot-1',
          {
            labors: [
              {
                kind: 'SIEMBRA' as const,
                occurredAt: new Date('2026-01-05T00:00:00.000Z'),
              },
            ],
            recipes: [],
          },
        ],
      ]),
    );

    const service = moduleRef.get(LotService);

    await expect(service.findAll('tenant-1')).resolves.toEqual([
      { ...baseLot, state: 'sembrado' },
    ]);
    expect(historyReader.findHistoryByLotIds).toHaveBeenCalledWith(['lot-1']);
  });

  it('scopes the client read and still derives the state', async () => {
    const { moduleRef, repository, historyReader, clientUserReader } =
      await compileLotModule();
    clientUserReader.findClientIdByUserId.mockResolvedValue('client-1');
    repository.findAllByClientId.mockResolvedValue([baseLot]);
    historyReader.findHistoryByLotIds.mockResolvedValue(
      new Map([
        [
          'lot-1',
          {
            labors: [
              {
                kind: 'COSECHA' as const,
                occurredAt: new Date('2026-06-01T00:00:00.000Z'),
              },
            ],
            recipes: [],
          },
        ],
      ]),
    );

    const service = moduleRef.get(LotService);

    await expect(
      service.findAllForUser('tenant-1', 'user-1', 'PRODUCTOR'),
    ).resolves.toEqual([{ ...baseLot, state: 'cosechado' }]);
    expect(repository.findAllByClientId).toHaveBeenCalledWith('client-1');
    expect(repository.findAllByTenantId).not.toHaveBeenCalled();
  });

  it('reports no lots for a client user with no client', async () => {
    const { moduleRef, repository, historyReader } = await compileLotModule();

    const service = moduleRef.get(LotService);

    await expect(
      service.findAllForUser('tenant-1', 'user-1', 'PRODUCTOR'),
    ).resolves.toEqual([]);
    expect(repository.findAllByClientId).not.toHaveBeenCalled();
    expect(historyReader.findHistoryByLotIds).not.toHaveBeenCalled();
  });
});
