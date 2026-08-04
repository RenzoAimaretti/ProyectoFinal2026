import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LotService } from './lot.service';
import { LOT_REPOSITORY } from './ports/lot.repository';
import { FARM_REPOSITORY } from '../farm/ports/farm.repository';
import { COMPANY_REPOSITORY } from '../company/ports/company.repository';
import { LIVESTOCK_REPOSITORY } from '../livestock/ports/livestock.repository';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual de
// lot contra puertos mockeados (plain objects + jest.fn(), sin test-doubles).
// Cross-reads vía puertos exportados por sus dueños (REQ-F2-03/D1, T-F2-20):
// farm-exists → FARM_REPOSITORY.findById, lista de farms de la empresa →
// FARM_REPOSITORY.findByCompany (reemplaza el include farms del prisma actual),
// company-exists → COMPANY_REPOSITORY.findById, escritura de ganado →
// LIVESTOCK_REPOSITORY.update (F1) + lot-side connect → LOT_REPOSITORY.assignStock.
// RED por diseño: ./ports/lot.repository no existe aún (se crea en T-F2-18).
// Nota: a diferencia de farm, las lecturas cruzadas del create (farm + duplicado)
// corren DENTRO del try/catch (comportamiento actual verificado en lot.service.ts):
// sus rechazos se envuelven en 500 'Error creating lot'; solo los throw síncronos
// (NotFoundException/BadRequestException) se re-lanzan crudos.

const baseLot = {
  id: 'lot-uuid-1',
  farmId: 'farm-uuid-1',
  name: 'Lote Norte',
  coords: '-31.4, -64.2',
  area: 120.5,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseFarm = {
  id: 'farm-uuid-1',
  companyId: 'company-uuid-1',
  name: 'Estancia El Potrero',
  location: 'Ruta 5, km 120',
  surface: 250.5,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseCompany = {
  id: 'company-uuid-1',
  name: 'Estancia La Esperanza',
  cuit: '30-71234567-8',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseLivestock = {
  id: 'livestock-uuid-1',
  companyId: 'company-uuid-1',
  lotId: null,
  tagNumber: 'LV-0001',
  species: 'Bovino',
  breed: null,
  sex: 'H',
  birthDate: null,
  status: 'ACTIVO',
  entryDate: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('LotService', () => {
  let service: LotService;
  let lotRepository: any;
  let farmRepository: any;
  let companyRepository: any;
  let livestockRepository: any;

  beforeEach(async () => {
    lotRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNameAndFarm: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignStock: jest.fn(),
    };

    farmRepository = {
      findById: jest.fn(),
      findByCompany: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
    };

    livestockRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LotService,
        { provide: LOT_REPOSITORY, useValue: lotRepository },
        { provide: FARM_REPOSITORY, useValue: farmRepository },
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
        { provide: LIVESTOCK_REPOSITORY, useValue: livestockRepository },
      ],
    }).compile();

    service = moduleRef.get<LotService>(LotService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      lotRepository.findAll.mockResolvedValue([baseLot]);

      const result = await service.findAll();

      expect(result).toEqual([baseLot]);
      expect(lotRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error fetching lots"', async () => {
      lotRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow('Error fetching lots');
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);

      const result = await service.findOne(baseLot.id);

      expect(result).toEqual(baseLot);
      expect(lotRepository.findById).toHaveBeenCalledWith(baseLot.id);
    });

    it('debería lanzar 404 "Lot with id X not found" si no existe', async () => {
      lotRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        'Lot with id missing-uuid not found',
      );
    });

    it('debería re-lanzar NotFound sin envolver y envolver el resto en 500', async () => {
      lotRepository.findById.mockRejectedValue(
        new NotFoundException('Lot with id X not found'),
      );

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );

      lotRepository.findById.mockRejectedValue(new Error('boom'));
      await expect(service.findOne(baseLot.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseLot.id)).rejects.toThrow(
        'Error fetching lot',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      name: 'Lote Sur',
      farmId: 'farm-uuid-1',
      coords: '-33.1, -65.8',
      area: 80,
    };

    it('debería validar farm + unicidad name+farmId y crear', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      lotRepository.findByNameAndFarm.mockResolvedValue(null);
      const created = { ...baseLot, id: 'lot-uuid-2', ...validBody };
      lotRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(farmRepository.findById).toHaveBeenCalledWith('farm-uuid-1');
      expect(lotRepository.findByNameAndFarm).toHaveBeenCalledWith(
        'Lote Sur',
        'farm-uuid-1',
      );
      expect(lotRepository.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual(created);
    });

    it('debería lanzar 400 "Missing required fields: name, farmId, coords, and area" si falta algún campo', async () => {
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        'Missing required fields: name, farmId, coords, and area',
      );
      expect(farmRepository.findById).not.toHaveBeenCalled();
      expect(lotRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Farm with this ID does not exist or lot with this name already exists in the farm" si la farm no existe', async () => {
      farmRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Farm with this ID does not exist or lot with this name already exists in the farm',
      );
      expect(lotRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Farm with this ID does not exist or lot with this name already exists in the farm" si el nombre duplica en la misma farm', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      lotRepository.findByNameAndFarm.mockResolvedValue({
        ...baseLot,
        id: 'other-uuid',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Farm with this ID does not exist or lot with this name already exists in the farm',
      );
      expect(lotRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver en 500 "Error creating lot" el rechazo de la lectura de farm (dentro del try/catch, byte-identical)', async () => {
      farmRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating lot',
      );
    });

    it('debería envolver en 500 "Error creating lot" el rechazo de la lectura de duplicados', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      lotRepository.findByNameAndFarm.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating lot',
      );
    });

    it('debería envolver errores inesperados del create en 500 "Error creating lot"', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      lotRepository.findByNameAndFarm.mockResolvedValue(null);
      lotRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating lot',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos cuando existe', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      const updated = { ...baseLot, name: 'Lote Renombrado' };
      lotRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseLot.id, {
        name: 'Lote Renombrado',
      });

      expect(lotRepository.findById).toHaveBeenCalledWith(baseLot.id);
      expect(lotRepository.update).toHaveBeenCalledWith(baseLot.id, {
        name: 'Lote Renombrado',
      });
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "No data provided for update" si el body está vacío', async () => {
      await expect(service.update(baseLot.id, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseLot.id, {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(lotRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Lot with id X not found" si no existe', async () => {
      lotRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow('Lot with id missing-uuid not found');
    });

    it('debería lanzar 404 "Farm with this ID does not exist" si se cambia a una farm inexistente', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(baseLot.id, { farmId: 'farm-uuid-2' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(baseLot.id, { farmId: 'farm-uuid-2' }),
      ).rejects.toThrow('Farm with this ID does not exist');
      expect(lotRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "Area must be a positive number" si area <= 0', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);

      await expect(service.update(baseLot.id, { area: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseLot.id, { area: 0 })).rejects.toThrow(
        'Area must be a positive number',
      );
      expect(lotRepository.update).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados del flujo en 500 "Error updating lot"', async () => {
      lotRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.update(baseLot.id, { name: 'X' })).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(baseLot.id, { name: 'X' })).rejects.toThrow(
        'Error updating lot',
      );
    });

    it('debería envolver el rechazo de la lectura de farm en 500 "Error updating lot"', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseLot.id, { farmId: 'farm-uuid-2' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseLot.id, { farmId: 'farm-uuid-2' }),
      ).rejects.toThrow('Error updating lot');
    });

    it('debería envolver el rechazo del update del puerto en 500 "Error updating lot"', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      lotRepository.update.mockRejectedValue(new Error('boom'));

      await expect(service.update(baseLot.id, { name: 'X' })).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(baseLot.id, { name: 'X' })).rejects.toThrow(
        'Error updating lot',
      );
    });
  });

  describe('addLiveStock', () => {
    it('debería validar lot/livestock/company/farm y componer las dos escrituras', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockResolvedValue([baseFarm]);
      livestockRepository.update.mockResolvedValue(baseLivestock);
      lotRepository.assignStock.mockResolvedValue(undefined);

      await service.addLiveStock('lot-uuid-1', 'livestock-uuid-1');

      expect(lotRepository.findById).toHaveBeenCalledWith('lot-uuid-1');
      expect(livestockRepository.findById).toHaveBeenCalledWith(
        'livestock-uuid-1',
      );
      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
      expect(farmRepository.findByCompany).toHaveBeenCalledWith(
        'company-uuid-1',
      );
      expect(livestockRepository.update).toHaveBeenCalledWith(
        'livestock-uuid-1',
        { lotId: 'lot-uuid-1' },
      );
      expect(lotRepository.assignStock).toHaveBeenCalledWith(
        'lot-uuid-1',
        'livestock-uuid-1',
      );
    });

    it('debería lanzar 404 "Lot or livestock not found" si el lot no existe', async () => {
      lotRepository.findById.mockResolvedValue(null);

      await expect(
        service.addLiveStock('missing-lot', 'livestock-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addLiveStock('missing-lot', 'livestock-uuid-1'),
      ).rejects.toThrow('Lot or livestock not found');
      expect(livestockRepository.update).not.toHaveBeenCalled();
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Lot or livestock not found" si el livestock no existe', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(null);

      await expect(
        service.addLiveStock('lot-uuid-1', 'missing-livestock'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'missing-livestock'),
      ).rejects.toThrow('Lot or livestock not found');
      expect(livestockRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Company with id X not found" si la empresa del livestock no existe', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(null);

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Company with id company-uuid-1 not found');
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "Lot farm does not belong to livestock company" si el lot no pertenece a ninguna farm de la empresa', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockResolvedValue([
        { ...baseFarm, id: 'farm-uuid-99' },
      ]);

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Lot farm does not belong to livestock company');
      expect(livestockRepository.update).not.toHaveBeenCalled();
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "Lot farm does not belong to livestock company" si la empresa no tiene farms (lista vacía)', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockResolvedValue([]);

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Lot farm does not belong to livestock company');
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lista de farms en 500 "Error adding livestock to lot"', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockRejectedValue(new Error('boom'));

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Error adding livestock to lot');
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lectura del lot en 500 "Error adding livestock to lot"', async () => {
      lotRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Error adding livestock to lot');
    });

    it('debería envolver el rechazo del update de livestock en 500 "Error adding livestock to lot"', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockResolvedValue([baseFarm]);
      livestockRepository.update.mockRejectedValue(new Error('boom'));

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Error adding livestock to lot');
      expect(lotRepository.assignStock).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo del assignStock en 500 "Error adding livestock to lot"', async () => {
      lotRepository.findById.mockResolvedValue(baseLot);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByCompany.mockResolvedValue([baseFarm]);
      livestockRepository.update.mockResolvedValue(baseLivestock);
      lotRepository.assignStock.mockRejectedValue(new Error('boom'));

      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.addLiveStock('lot-uuid-1', 'livestock-uuid-1'),
      ).rejects.toThrow('Error adding livestock to lot');
    });
  });
});
