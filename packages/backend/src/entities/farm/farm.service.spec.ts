import { FarmService } from './farm.service';
import { FindAllFarmsUseCase } from './application/use-cases/find-all-farms.use-case';
import { FindFarmUseCase } from './application/use-cases/find-farm.use-case';
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { UpdateFarmUseCase } from './application/use-cases/update-farm.use-case';

function createService() {
  const findAll = { execute: jest.fn(), executeByClient: jest.fn() };
  const findOne = { execute: jest.fn() };
  const create = { execute: jest.fn() };
  const update = { execute: jest.fn() };
  const clientUserReader = { findClientIdByUserId: jest.fn() };

  const service = new FarmService(
    findAll as unknown as FindAllFarmsUseCase,
    findOne as unknown as FindFarmUseCase,
    create as unknown as CreateFarmUseCase,
    update as unknown as UpdateFarmUseCase,
    clientUserReader as never,
  );

  return { service, findAll, clientUserReader };
}

describe('FarmService scoping', () => {
  it('keeps the tenant-wide read for admins', async () => {
    const { service, findAll, clientUserReader } = createService();
    findAll.execute.mockResolvedValue([{ id: 'farm-1' }]);

    await expect(
      service.findAllForUser('tenant-1', 'user-1', 'ADMIN'),
    ).resolves.toEqual([{ id: 'farm-1' }]);

    expect(findAll.execute).toHaveBeenCalledWith('tenant-1');
    expect(findAll.executeByClient).not.toHaveBeenCalled();
    expect(clientUserReader.findClientIdByUserId).not.toHaveBeenCalled();
  });

  it('scopes a productor to their own client', async () => {
    const { service, findAll, clientUserReader } = createService();
    clientUserReader.findClientIdByUserId.mockResolvedValue('client-own');
    findAll.executeByClient.mockResolvedValue([{ id: 'farm-1' }]);

    await expect(
      service.findAllForUser('tenant-1', 'user-2', 'PRODUCTOR'),
    ).resolves.toEqual([{ id: 'farm-1' }]);

    expect(clientUserReader.findClientIdByUserId).toHaveBeenCalledWith('user-2');
    expect(findAll.executeByClient).toHaveBeenCalledWith('client-own');
    expect(findAll.execute).not.toHaveBeenCalled();
  });

  it('returns an empty list for a productor without a linked client', async () => {
    const { service, findAll, clientUserReader } = createService();
    clientUserReader.findClientIdByUserId.mockResolvedValue(null);

    await expect(
      service.findAllForUser('tenant-1', 'user-2', 'PRODUCTOR'),
    ).resolves.toEqual([]);

    expect(findAll.execute).not.toHaveBeenCalled();
    expect(findAll.executeByClient).not.toHaveBeenCalled();
  });
});
