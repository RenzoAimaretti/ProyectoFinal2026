import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CLIENT_USER_READER } from '../client/application/client.ports';
import { LOT_HISTORY_READER, LOT_REPOSITORY } from './application/lot.ports';
import type { LotHistoryReaderPort } from './application/lot.ports';
import type { LotRepositoryPort } from './application/lot.ports';
import type { LotRecord } from './application/lot.types';
import { LotModule } from './lot.module';
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

async function compileLotModule() {
  const repository: jest.Mocked<LotRepositoryPort> = {
    findAllByTenantId: jest.fn().mockResolvedValue([]),
    findAllByClientId: jest.fn().mockResolvedValue([]),
    findByIdForTenant: jest.fn().mockResolvedValue(null),
    findByNameAndFarmId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateForTenant: jest.fn(),
  };

  const historyReader: jest.Mocked<LotHistoryReaderPort> = {
    findHistoryByLotIds: jest.fn().mockResolvedValue(new Map()),
  };

  const clientUserReader = {
    findClientIdByUserId: jest.fn().mockResolvedValue(null),
  };

  const moduleRef = await Test.createTestingModule({ imports: [LotModule] })
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
