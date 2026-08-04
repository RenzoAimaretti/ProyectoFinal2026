import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LivestockService } from './livestock.service';
import { LIVESTOCK_REPOSITORY } from './ports/livestock.repository';
import { COMPANY_REPOSITORY } from '../company/ports/company.repository';
import { LOT_REPOSITORY } from '../lot/ports/lot.repository';
import { FARM_REPOSITORY } from '../farm/ports/farm.repository';

// Contract-locking spec (REQ-T-01/02/03/05): congela REQ-C-03..REQ-C-08 y SC-LV-01..15
// contra puertos mockeados (plain objects + jest.fn(), sin librería de test-doubles).
// T-F2-23 (D1): los puertos de capacidad angosta (COMPANY_LOOKUP/LOT_LOOKUP del
// piloto F1) se reemplazan por los puertos exportados por sus dueños:
// companyExists → COMPANY_REPOSITORY.findById, findLotWithFarm →
// LOT_REPOSITORY.findById + FARM_REPOSITORY.findById(lot.farmId) (la empresa del
// lote se lee vía el agregado farm). API contract byte-idéntico (REQ-C-03..08).

const baseLivestock = {
  id: 'livestock-uuid-1',
  companyId: 'company-uuid-1',
  lotId: 'lot-uuid-1',
  tagNumber: 'TAG-001',
  breed: 'Angus',
  species: 'Bovino',
  birthDate: new Date('2020-01-15T10:00:00.000Z'),
  sex: 'Macho',
  status: 'ACTIVO',
  entryDate: new Date('2024-01-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseCompany = {
  id: 'company-uuid-1',
  name: 'Empresa Uno',
  cuit: '30-71234567-8',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseFarm = {
  id: 'farm-uuid-1',
  companyId: 'company-uuid-1',
  name: 'Estancia Uno',
  location: null,
  surface: 1000,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseLot = {
  id: 'lot-uuid-1',
  farmId: 'farm-uuid-1',
  name: 'Lote Uno',
  coords: null,
  area: 120.5,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('LivestockService', () => {
  let service: LivestockService;
  let livestockRepository: any;
  let companyRepository: any;
  let lotRepository: any;
  let farmRepository: any;

  beforeEach(async () => {
    livestockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithLotFarm: jest.fn(),
      findByTagNumber: jest.fn(),
      findByTagNumberExcluding: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
    };

    lotRepository = {
      findById: jest.fn(),
    };

    farmRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LivestockService,
        { provide: LIVESTOCK_REPOSITORY, useValue: livestockRepository },
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
        { provide: LOT_REPOSITORY, useValue: lotRepository },
        { provide: FARM_REPOSITORY, useValue: farmRepository },
      ],
    }).compile();

    service = module.get<LivestockService>(LivestockService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto (SC-LV-01 shape)', async () => {
      livestockRepository.findAll.mockResolvedValue([baseLivestock]);

      const result = await service.findAll();

      expect(result).toEqual([baseLivestock]);
      expect(livestockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error fetching livestock" (REQ-C-08)', async () => {
      livestockRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow(
        'Error fetching livestock',
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);

      const result = await service.findOne(baseLivestock.id);

      expect(result).toEqual(baseLivestock);
      expect(livestockRepository.findById).toHaveBeenCalledWith(
        baseLivestock.id,
      );
    });

    it('debería lanzar 404 "Livestock with id X not found" si no existe (SC-LV-15)', async () => {
      livestockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        'Livestock with id missing-uuid not found',
      );
    });

    it('debería re-lanzar NotFound sin envolver y envolver el resto en 500 (REQ-C-08)', async () => {
      livestockRepository.findById.mockRejectedValue(
        new NotFoundException('Livestock with id X not found'),
      );

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );

      livestockRepository.findById.mockRejectedValue(new Error('boom'));
      await expect(service.findOne(baseLivestock.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseLivestock.id)).rejects.toThrow(
        'Error fetching livestock',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      companyId: 'company-uuid-1',
      lotId: 'lot-uuid-1',
      tagNumber: 'TAG-002',
      breed: 'Hereford',
      species: 'Bovino',
      birthDate: '2021-05-20T10:00:00.000Z',
      sex: 'Hembra',
    };

    it('debería validar la empresa, el lote, la unicidad y crear normalizando lotId/breed (SC-LV-01, REQ-C-07)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockResolvedValue(baseFarm);
      livestockRepository.findByTagNumber.mockResolvedValue(null);
      const created = {
        ...baseLivestock,
        id: 'livestock-uuid-2',
        ...validBody,
        lotId: validBody.lotId,
      };
      livestockRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
      expect(lotRepository.findById).toHaveBeenCalledWith('lot-uuid-1');
      expect(farmRepository.findById).toHaveBeenCalledWith('farm-uuid-1');
      expect(livestockRepository.findByTagNumber).toHaveBeenCalledWith(
        'TAG-002',
      );
      expect(livestockRepository.create).toHaveBeenCalledWith({
        companyId: 'company-uuid-1',
        lotId: 'lot-uuid-1',
        tagNumber: 'TAG-002',
        breed: 'Hereford',
        species: 'Bovino',
        birthDate: new Date('2021-05-20T10:00:00.000Z'),
        sex: 'Hembra',
      });
      expect(result).toEqual(created);
    });

    it('debería crear con lotId y breed nulos cuando no se proveen (REQ-C-07)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      livestockRepository.findByTagNumber.mockResolvedValue(null);
      const created = {
        ...baseLivestock,
        id: 'livestock-uuid-3',
        tagNumber: 'TAG-003',
        lotId: null,
        breed: null,
      };
      livestockRepository.create.mockResolvedValue(created);

      const result = await service.create({
        companyId: 'company-uuid-1',
        tagNumber: 'TAG-003',
        species: 'Bovino',
        sex: 'Macho',
      });

      expect(lotRepository.findById).not.toHaveBeenCalled();
      expect(livestockRepository.create).toHaveBeenCalledWith({
        companyId: 'company-uuid-1',
        lotId: null,
        tagNumber: 'TAG-003',
        breed: null,
        species: 'Bovino',
        sex: 'Macho',
      });
      expect(result).toEqual(created);
    });

    it('debería lanzar 404 "Company with id X not found" si la empresa no existe (SC-LV-02)', async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Company with id company-uuid-1 not found',
      );
      expect(livestockRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Lot with id X not found" si el lote no existe (SC-LV-03)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Lot with id lot-uuid-1 not found',
      );
    });

    it('debería lanzar 400 "Lot must belong to the same company as the livestock" si el lote es de otra empresa (SC-LV-04)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockResolvedValue({
        ...baseFarm,
        companyId: 'company-uuid-2',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Lot must belong to the same company as the livestock',
      );
    });

    it('debería lanzar 409 "Livestock with this tagNumber already exists" si el tagNumber ya existe (SC-LV-05)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockResolvedValue(baseFarm);
      livestockRepository.findByTagNumber.mockResolvedValue({
        ...baseLivestock,
        id: 'other-uuid',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Livestock with this tagNumber already exists',
      );
      expect(livestockRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "birthDate must be a valid date" si la fecha es inválida (SC-LV-06, REQ-C-05)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue(baseLot);
      farmRepository.findById.mockResolvedValue(baseFarm);

      await expect(
        service.create({ ...validBody, birthDate: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...validBody, birthDate: 'not-a-date' }),
      ).rejects.toThrow('birthDate must be a valid date');
    });

    it.each([
      ['companyId', { companyId: '' }],
      ['tagNumber', { tagNumber: '   ' }],
      ['species', { species: '' }],
      ['sex', { sex: '' }],
    ])(
      'debería lanzar 400 "%s is required" si el campo requerido falta o es vacío (SC-LV-07, REQ-C-04)',
      async (_field, missing) => {
        await expect(
          service.create({ ...validBody, ...missing }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.create({ ...validBody, ...missing }),
        ).rejects.toThrow(`${_field} is required`);
        expect(companyRepository.findById).not.toHaveBeenCalled();
        expect(livestockRepository.create).not.toHaveBeenCalled();
      },
    );

    it('debería envolver errores inesperados en 500 "Error creating livestock" (REQ-C-08)', async () => {
      companyRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating livestock',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos (SC-LV-08, REQ-C-07)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue({
        ...baseLivestock,
        lot: { farm: { companyId: 'company-uuid-1' } },
      });
      livestockRepository.findByTagNumberExcluding.mockResolvedValue(null);
      const updated = { ...baseLivestock, tagNumber: 'TAG-NEW' };
      livestockRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseLivestock.id, {
        tagNumber: 'TAG-NEW',
      });

      expect(livestockRepository.findByIdWithLotFarm).toHaveBeenCalledWith(
        baseLivestock.id,
      );
      expect(livestockRepository.findByTagNumberExcluding).toHaveBeenCalledWith(
        'TAG-NEW',
        baseLivestock.id,
      );
      expect(livestockRepository.update).toHaveBeenCalledWith(
        baseLivestock.id,
        { tagNumber: 'TAG-NEW' },
      );
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "No data provided for update" si todos los campos son undefined (SC-LV-09)', async () => {
      await expect(service.update(baseLivestock.id, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseLivestock.id, {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(livestockRepository.findByIdWithLotFarm).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Livestock with id X not found" si no existe (SC-LV-10)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('missing-uuid', { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow('Livestock with id missing-uuid not found');
    });

    it('debería lanzar 409 y excluir el propio id en la unicidad (SC-LV-11, REQ-C-06)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue({
        ...baseLivestock,
        lot: { farm: { companyId: 'company-uuid-1' } },
      });
      livestockRepository.findByTagNumberExcluding.mockResolvedValue({
        ...baseLivestock,
        id: 'other-uuid',
      });

      await expect(
        service.update(baseLivestock.id, { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(baseLivestock.id, { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow('Livestock with this tagNumber already exists');
      expect(livestockRepository.findByTagNumberExcluding).toHaveBeenCalledWith(
        'TAG-NEW',
        baseLivestock.id,
      );
    });

    it('debería validar el nuevo lote contra nextCompanyId al cambiar companyId (SC-LV-12)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue({
        ...baseLivestock,
        lot: { farm: { companyId: 'company-uuid-1' } },
      });
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue({
        ...baseLot,
        id: 'lot-uuid-2',
        farmId: 'farm-uuid-2',
      });
      farmRepository.findById.mockResolvedValue({
        ...baseFarm,
        id: 'farm-uuid-2',
        companyId: 'company-uuid-2',
      });
      livestockRepository.update.mockResolvedValue({
        ...baseLivestock,
        companyId: 'company-uuid-2',
        lotId: 'lot-uuid-2',
      });

      const result = await service.update(baseLivestock.id, {
        companyId: 'company-uuid-2',
        lotId: 'lot-uuid-2',
      });

      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-2');
      expect(lotRepository.findById).toHaveBeenCalledWith('lot-uuid-2');
      expect(farmRepository.findById).toHaveBeenCalledWith('farm-uuid-2');
      expect(result.companyId).toEqual('company-uuid-2');
    });

    it('debería lanzar 400 si el nuevo lote pertenece a otra empresa (SC-LV-12 negativo)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue({
        ...baseLivestock,
        lot: { farm: { companyId: 'company-uuid-1' } },
      });
      companyRepository.findById.mockResolvedValue(baseCompany);
      lotRepository.findById.mockResolvedValue({
        ...baseLot,
        id: 'lot-uuid-2',
        farmId: 'farm-uuid-1',
      });
      farmRepository.findById.mockResolvedValue(baseFarm);

      await expect(
        service.update(baseLivestock.id, {
          companyId: 'company-uuid-2',
          lotId: 'lot-uuid-2',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(baseLivestock.id, {
          companyId: 'company-uuid-2',
          lotId: 'lot-uuid-2',
        }),
      ).rejects.toThrow('Lot must belong to the same company as the livestock');
    });

    it('debería lanzar 400 "tagNumber is required" si el tagNumber provisto es vacío (REQ-C-04)', async () => {
      livestockRepository.findByIdWithLotFarm.mockResolvedValue({
        ...baseLivestock,
        lot: { farm: { companyId: 'company-uuid-1' } },
      });

      await expect(
        service.update(baseLivestock.id, { tagNumber: '  ' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(baseLivestock.id, { tagNumber: '  ' }),
      ).rejects.toThrow('tagNumber is required');
    });

    it('debería envolver errores inesperados en 500 "Error updating livestock" (REQ-C-08)', async () => {
      livestockRepository.findByIdWithLotFarm.mockRejectedValue(
        new Error('boom'),
      );

      await expect(
        service.update(baseLivestock.id, { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseLivestock.id, { tagNumber: 'TAG-NEW' }),
      ).rejects.toThrow('Error updating livestock');
    });
  });

  describe('remove', () => {
    it('debería eliminar y retornar el mensaje exacto (SC-LV-13)', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      livestockRepository.delete.mockResolvedValue(baseLivestock);

      const result = await service.remove(baseLivestock.id);

      expect(result).toEqual({
        message: 'Livestock with id livestock-uuid-1 deleted successfully',
      });
      expect(livestockRepository.findById).toHaveBeenCalledWith(
        baseLivestock.id,
      );
      expect(livestockRepository.delete).toHaveBeenCalledWith(baseLivestock.id);
    });

    it('debería lanzar 404 "Livestock with id X not found" si no existe (SC-LV-14)', async () => {
      livestockRepository.findById.mockResolvedValue(null);

      await expect(service.remove('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('missing-uuid')).rejects.toThrow(
        'Livestock with id missing-uuid not found',
      );
      expect(livestockRepository.delete).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados en 500 "Error deleting livestock" (REQ-C-08)', async () => {
      livestockRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.remove(baseLivestock.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.remove(baseLivestock.id)).rejects.toThrow(
        'Error deleting livestock',
      );
    });
  });
});
