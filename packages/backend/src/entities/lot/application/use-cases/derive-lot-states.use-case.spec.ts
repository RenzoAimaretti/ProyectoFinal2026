import { DeriveLotStatesUseCase } from './derive-lot-states.use-case';
import type { LotHistoryReaderPort } from '../lot.ports';
import type { LotRecord } from '../lot.types';

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

function createReader() {
  const reader: jest.Mocked<LotHistoryReaderPort> = {
    findHistoryByLotIds: jest.fn().mockResolvedValue(new Map()),
  };

  return reader;
}

describe('DeriveLotStatesUseCase', () => {
  it('does not ask for history when there are no lots', async () => {
    const reader = createReader();
    const useCase = new DeriveLotStatesUseCase(reader);

    await expect(useCase.execute([])).resolves.toEqual([]);
    expect(reader.findHistoryByLotIds).not.toHaveBeenCalled();
  });

  it('asks only for the lots it was given', async () => {
    const reader = createReader();
    const useCase = new DeriveLotStatesUseCase(reader);

    await useCase.execute([baseLot, { ...baseLot, id: 'lot-2' }]);

    expect(reader.findHistoryByLotIds).toHaveBeenCalledWith([
      'lot-1',
      'lot-2',
    ]);
  });

  it('reports a lot with no history as libre', async () => {
    const reader = createReader();
    const useCase = new DeriveLotStatesUseCase(reader);

    await expect(useCase.execute([baseLot])).resolves.toEqual([
      { ...baseLot, state: 'libre' },
    ]);
  });

  it('attaches the state derived from the lot history, per lot', async () => {
    const reader = createReader();
    reader.findHistoryByLotIds.mockResolvedValue(
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
        [
          'lot-2',
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

    const useCase = new DeriveLotStatesUseCase(reader);

    await expect(
      useCase.execute([baseLot, { ...baseLot, id: 'lot-2' }]),
    ).resolves.toEqual([
      { ...baseLot, state: 'cosechado' },
      { ...baseLot, id: 'lot-2', state: 'sembrado' },
    ]);
  });

  it('does not mutate the lots it receives', async () => {
    const reader = createReader();
    const lot = { ...baseLot };

    await new DeriveLotStatesUseCase(reader).execute([lot]);

    expect(lot).not.toHaveProperty('state');
  });
});
