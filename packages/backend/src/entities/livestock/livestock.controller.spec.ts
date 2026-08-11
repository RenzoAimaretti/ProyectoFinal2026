import { Test, TestingModule } from '@nestjs/testing';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';

describe('LivestockController', () => {
  let controller: LivestockController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockController],
      providers: [{ provide: LivestockService, useValue: service }],
    }).compile();

    controller = module.get(LivestockController);
  });

  it('delegates livestock routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'livestock-1' }]);
    service.findOne.mockResolvedValue({ id: 'livestock-1' });
    service.create.mockResolvedValue({ id: 'livestock-2' });
    service.update.mockResolvedValue({
      id: 'livestock-1',
      tagNumber: 'TAG-002',
    });
    service.remove.mockResolvedValue({ message: 'deleted' });

    await expect(controller.findAll()).resolves.toEqual([
      { id: 'livestock-1' },
    ]);
    await expect(controller.findOne('livestock-1')).resolves.toEqual({
      id: 'livestock-1',
    });
    await expect(
      controller.create({
        companyId: 'company-1',
        tagNumber: 'TAG-002',
        species: 'Bovine',
        sex: 'M',
      }),
    ).resolves.toEqual({ id: 'livestock-2' });
    await expect(
      controller.update('livestock-1', { tagNumber: 'TAG-002' }),
    ).resolves.toEqual({
      id: 'livestock-1',
      tagNumber: 'TAG-002',
    });
    await expect(controller.remove('livestock-1')).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('livestock-1');
    expect(service.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      tagNumber: 'TAG-002',
      species: 'Bovine',
      sex: 'M',
    });
    expect(service.update).toHaveBeenCalledWith('livestock-1', {
      tagNumber: 'TAG-002',
    });
    expect(service.remove).toHaveBeenCalledWith('livestock-1');
  });
});
