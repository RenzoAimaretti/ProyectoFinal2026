import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { COMPANY_REPOSITORY } from './ports/company.repository';
import { MODULE_ENTITY_REPOSITORY } from '../module-entity/ports/module-entity.repository';

// Contract-locking spec (REQ-T-01/02/03): congela las reglas de company
// (validación, unicidad de CUIT, update y addModule con cross-read de module vía
// MODULE_ENTITY_REPOSITORY exportado — REQ-F2-03, D1) contra puertos mockeados.
// Nota: en addModule las excepciones internas (NotFound/Conflict) son INTRAGABLES
// por el try/catch del service: el contrato observable es 400
// 'Error adding module to company' en cualquier fallo (REQ-C-03, byte-identical).
// RED por diseño: ./ports/* y ../module-entity/ports/* se crean en T-F2-07/T-F2-02.

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

describe('CompanyService', () => {
  let service: CompanyService;
  let companyRepository: any;
  let moduleRepository: any;

  beforeEach(async () => {
    companyRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCuit: jest.fn(),
      findByIdWithModules: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignModule: jest.fn(),
    };

    moduleRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
        { provide: MODULE_ENTITY_REPOSITORY, useValue: moduleRepository },
      ],
    }).compile();

    service = moduleRef.get<CompanyService>(CompanyService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      companyRepository.findAll.mockResolvedValue([baseCompany]);

      const result = await service.findAll();

      expect(result).toEqual([baseCompany]);
      expect(companyRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería PROPAGAR CRUDO el error del puerto en findAll (return sin await, byte-identical)', async () => {
      // El try/catch de findAll solo captura throws síncronos: el
      // `return this.repository.findAll()` (sin await) hace que el rechazo del
      // puerto ESCAPE y llegue crudo (verificado en vivo, REQ-C-03/REQ-C-08).
      companyRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow('boom');
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila con sus módulos si existe', async () => {
      companyRepository.findByIdWithModules.mockResolvedValue({
        ...baseCompany,
        modules: [{ id: 'module-uuid-1' }],
      });

      const result = await service.findOne(baseCompany.id);

      expect(result).toEqual({
        ...baseCompany,
        modules: [{ id: 'module-uuid-1' }],
      });
      expect(companyRepository.findByIdWithModules).toHaveBeenCalledWith(
        baseCompany.id,
      );
    });

    it('debería retornar null si no existe', async () => {
      companyRepository.findByIdWithModules.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).resolves.toBeNull();
    });

    it('debería PROPAGAR CRUDO el error del puerto en findOne (return sin await, byte-identical)', async () => {
      // `return this.repository.findByIdWithModules(...)` sin await → el rechazo
      // del puerto escapa del try/catch (verificado en vivo, REQ-C-03).
      companyRepository.findByIdWithModules.mockRejectedValue(
        new Error('boom'),
      );

      await expect(service.findOne(baseCompany.id)).rejects.toThrow('boom');
    });
  });

  describe('findByCuit', () => {
    it('debería retornar la fila (con módulos) si existe', async () => {
      companyRepository.findByCuit.mockResolvedValue({
        ...baseCompany,
        modules: [],
      });

      const result = await service.findByCuit('30-71234567-8');

      expect(result).toEqual({ ...baseCompany, modules: [] });
      expect(companyRepository.findByCuit).toHaveBeenCalledWith(
        '30-71234567-8',
      );
    });

    it('debería PROPAGAR CRUDO el error del puerto en findByCuit (return sin await, byte-identical)', async () => {
      // `return this.repository.findByCuit(...)` sin await → el rechazo del puerto
      // escapa del try/catch (verificado en vivo, REQ-C-03).
      companyRepository.findByCuit.mockRejectedValue(new Error('boom'));

      await expect(service.findByCuit('30-71234567-8')).rejects.toThrow('boom');
    });
  });

  describe('create', () => {
    const validBody = { name: 'Nueva Empresa', cuit: '30-99999999-9' };

    it('debería crear la empresa cuando los datos son válidos y el CUIT no existe', async () => {
      companyRepository.findByCuit.mockResolvedValue(null);
      companyRepository.create.mockResolvedValue({
        ...baseCompany,
        ...validBody,
      });

      const result = await service.create(validBody);

      expect(companyRepository.findByCuit).toHaveBeenCalledWith(validBody.cuit);
      expect(companyRepository.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual({ ...baseCompany, ...validBody });
    });

    it('debería lanzar 400 "Missing required fields: name and cuit" si falta algún campo', async () => {
      await expect(
        service.create({ name: '', cuit: '30-99999999-9' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ name: '', cuit: '30-99999999-9' }),
      ).rejects.toThrow('Missing required fields: name and cuit');
      expect(companyRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 409 "Company with this CUIT already exists" si el CUIT ya existe', async () => {
      companyRepository.findByCuit.mockResolvedValue({
        ...baseCompany,
        id: 'other-uuid',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Company with this CUIT already exists',
      );
      expect(companyRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debería actualizar la empresa cuando existe (campos legacy nombre/cuit/estado)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      const updated = { ...baseCompany, name: 'Nombre Nuevo' };
      companyRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseCompany.id, {
        nombre: 'Nombre Nuevo',
      });

      expect(companyRepository.findById).toHaveBeenCalledWith(baseCompany.id);
      expect(companyRepository.update).toHaveBeenCalledWith(baseCompany.id, {
        nombre: 'Nombre Nuevo',
      });
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "No data provided for update" si el body está vacío', async () => {
      await expect(service.update(baseCompany.id, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseCompany.id, {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Company with id X not found" si no existe', async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { nombre: 'X' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('missing-uuid', { nombre: 'X' }),
      ).rejects.toThrow('Company with id missing-uuid not found');
    });
  });

  describe('addModule', () => {
    it('debería asignar el módulo y retornar el mensaje exacto', async () => {
      companyRepository.findByIdWithModules.mockResolvedValue({
        ...baseCompany,
        modules: [],
      });
      moduleRepository.findById.mockResolvedValue({
        id: 'module-uuid-1',
        name: 'Módulo Gestión',
        price: 1500,
        version: '1.0.0',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      companyRepository.assignModule.mockResolvedValue(undefined);

      const result = await service.addModule(baseCompany.id, 'module-uuid-1');

      expect(companyRepository.findByIdWithModules).toHaveBeenCalledWith(
        baseCompany.id,
      );
      expect(moduleRepository.findById).toHaveBeenCalledWith('module-uuid-1');
      expect(companyRepository.assignModule).toHaveBeenCalledWith(
        baseCompany.id,
        'module-uuid-1',
      );
      expect(result).toEqual({
        message:
          'Módulo Gestión added successfully to company: Estancia La Esperanza',
      });
    });

    it('debería lanzar 400 "Error adding module to company" si la empresa o el módulo no existen', async () => {
      companyRepository.findByIdWithModules.mockResolvedValue(null);

      await expect(
        service.addModule('missing-company', 'module-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addModule('missing-company', 'module-uuid-1'),
      ).rejects.toThrow('Error adding module to company');
      expect(companyRepository.assignModule).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "Error adding module to company" si el módulo ya está asignado', async () => {
      companyRepository.findByIdWithModules.mockResolvedValue({
        ...baseCompany,
        modules: [{ id: 'module-uuid-1' }],
      });
      moduleRepository.findById.mockResolvedValue({
        id: 'module-uuid-1',
        name: 'Módulo Gestión',
        price: 1500,
        version: '1.0.0',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      await expect(
        service.addModule(baseCompany.id, 'module-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addModule(baseCompany.id, 'module-uuid-1'),
      ).rejects.toThrow('Error adding module to company');
      expect(companyRepository.assignModule).not.toHaveBeenCalled();
    });

    it('debería envolver errores del puerto en 400 "Error adding module to company"', async () => {
      companyRepository.findByIdWithModules.mockRejectedValue(
        new Error('boom'),
      );

      await expect(
        service.addModule(baseCompany.id, 'module-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addModule(baseCompany.id, 'module-uuid-1'),
      ).rejects.toThrow('Error adding module to company');
    });
  });
});
