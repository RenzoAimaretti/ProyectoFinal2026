import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FarmService } from './farm.service';
import { FARM_REPOSITORY } from './ports/farm.repository';
import { COMPANY_REPOSITORY } from '../company/ports/company.repository';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual de
// farm (validación, unicidad name+companyId, cross-read de empresa vía
// COMPANY_REPOSITORY exportado por el dueño — REQ-F2-03/D1, T-F2-15) contra
// puertos mockeados (plain objects + jest.fn(), sin librería de test-doubles).
// RED por diseño: ./ports/farm.repository no existe aún (se crea en T-F2-13).
// Nota: las lecturas cruzadas (company) y de duplicados corren FUERA del try/catch
// del create (comportamiento actual verificado): sus rechazos PROPAGAN crudo;
// solo el create final envuelve en 500 'Error creating farm'.

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

describe('FarmService', () => {
  let service: FarmService;
  let farmRepository: any;
  let companyRepository: any;

  beforeEach(async () => {
    farmRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNameAndCompany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FarmService,
        { provide: FARM_REPOSITORY, useValue: farmRepository },
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
      ],
    }).compile();

    service = moduleRef.get<FarmService>(FarmService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      farmRepository.findAll.mockResolvedValue([baseFarm]);

      const result = await service.findAll();

      expect(result).toEqual([baseFarm]);
      expect(farmRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error fetching farms"', async () => {
      farmRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow('Error fetching farms');
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);

      const result = await service.findOne(baseFarm.id);

      expect(result).toEqual(baseFarm);
      expect(farmRepository.findById).toHaveBeenCalledWith(baseFarm.id);
    });

    it('debería lanzar 404 "Farm with id X not found" si no existe', async () => {
      farmRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        'Farm with id missing-uuid not found',
      );
    });

    it('debería re-lanzar NotFound sin envolver y envolver el resto en 500', async () => {
      farmRepository.findById.mockRejectedValue(
        new NotFoundException('Farm with id X not found'),
      );

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );

      farmRepository.findById.mockRejectedValue(new Error('boom'));
      await expect(service.findOne(baseFarm.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseFarm.id)).rejects.toThrow(
        'Error fetching farm',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      name: 'Estancia Nueva',
      location: 'Ruta 3, km 80',
      companyId: 'company-uuid-1',
      surface: 120,
    };

    it('debería validar la empresa, la unicidad name+companyId y crear', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByNameAndCompany.mockResolvedValue(null);
      const created = { ...baseFarm, id: 'farm-uuid-2', ...validBody };
      farmRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
      expect(farmRepository.findByNameAndCompany).toHaveBeenCalledWith(
        'Estancia Nueva',
        'company-uuid-1',
      );
      expect(farmRepository.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual(created);
    });

    it('debería lanzar 400 "Missing required fields: name, location, companyId and surface" si falta algún campo', async () => {
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        'Missing required fields: name, location, companyId and surface',
      );
      expect(companyRepository.findById).not.toHaveBeenCalled();
      expect(farmRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "A farm with this name already exists for the specified company" si la farm duplicada existe', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByNameAndCompany.mockResolvedValue({
        ...baseFarm,
        id: 'other-uuid',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'A farm with this name already exists for the specified company',
      );
      expect(farmRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Company with this ID does not exist" si la empresa no existe', async () => {
      companyRepository.findById.mockResolvedValue(null);
      farmRepository.findByNameAndCompany.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Company with this ID does not exist',
      );
      expect(farmRepository.create).not.toHaveBeenCalled();
    });

    it('debería PROPAGAR CRUDO el rechazo de la lectura de empresa (fuera del try/catch, byte-identical)', async () => {
      companyRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow('boom');
    });

    it('debería PROPAGAR CRUDO el rechazo de la lectura de duplicados (fuera del try/catch, byte-identical)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByNameAndCompany.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow('boom');
    });

    it('debería envolver errores inesperados del create en 500 "Error creating farm"', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      farmRepository.findByNameAndCompany.mockResolvedValue(null);
      farmRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating farm',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos cuando existe', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      const updated = { ...baseFarm, name: 'Estancia Renombrada' };
      farmRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseFarm.id, {
        name: 'Estancia Renombrada',
      });

      expect(farmRepository.findById).toHaveBeenCalledWith(baseFarm.id);
      expect(farmRepository.update).toHaveBeenCalledWith(baseFarm.id, {
        name: 'Estancia Renombrada',
      });
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "No data provided for update" si el body está vacío', async () => {
      await expect(service.update(baseFarm.id, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseFarm.id, {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(farmRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Farm with id X not found" si no existe', async () => {
      farmRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow('Farm with id missing-uuid not found');
    });

    it('debería lanzar 404 "Company with this ID does not exist" si se cambia a una empresa inexistente', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      companyRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(baseFarm.id, { companyId: 'company-uuid-2' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(baseFarm.id, { companyId: 'company-uuid-2' }),
      ).rejects.toThrow('Company with this ID does not exist');
      expect(farmRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "Surface must be a positive number" si surface <= 0', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);

      await expect(service.update(baseFarm.id, { surface: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseFarm.id, { surface: 0 })).rejects.toThrow(
        'Surface must be a positive number',
      );
      expect(farmRepository.update).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados del flujo en 500 "Error updating farm"', async () => {
      farmRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.update(baseFarm.id, { name: 'X' })).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(baseFarm.id, { name: 'X' })).rejects.toThrow(
        'Error updating farm',
      );
    });

    it('debería envolver el rechazo de la lectura de empresa en 500 "Error updating farm"', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      companyRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseFarm.id, { companyId: 'company-uuid-2' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseFarm.id, { companyId: 'company-uuid-2' }),
      ).rejects.toThrow('Error updating farm');
    });

    it('debería envolver el rechazo del update del puerto en 500 "Error updating farm"', async () => {
      farmRepository.findById.mockResolvedValue(baseFarm);
      farmRepository.update.mockRejectedValue(new Error('boom'));

      await expect(service.update(baseFarm.id, { name: 'X' })).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(baseFarm.id, { name: 'X' })).rejects.toThrow(
        'Error updating farm',
      );
    });
  });
});
