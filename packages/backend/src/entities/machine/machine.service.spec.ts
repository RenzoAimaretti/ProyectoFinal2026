import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { MachineService } from './machine.service';
import { MACHINE_REPOSITORY } from './ports/machine.repository';
import { COMPANY_REPOSITORY } from '../company/ports/company.repository';
import { MachineStatus } from './domain/machine-status';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual
// de machine contra puertos mockeados (plain objects + jest.fn()).
// RED por diseño: ./ports/machine.repository y ./domain/machine-status no
// existen aún (se crean en T-F2-54).
// Nota de contrato (verificado contra el legacy): el catch general de machine
// REEMPLAZA los throws internos — el mensaje observable para CUALQUIER fallo de
// create/update es el genérico ('Error creating machine'/'Error updating
// machine'). Los mensajes internos legacy ('Machine with id X not found',
// 'Company with this ID does not exist', 'Invalid date format...') quedan
// swalloweados por el catch; el spec los congeló como FLUJO (qué puerto se
// llamó y qué NO se llamó) con el mensaje genérico observable. El cross-read de
// empresa corre DENTRO del try → 500 genérico (a diferencia de farm).

const baseMachine = {
  id: 'machine-uuid-1',
  companyId: 'company-uuid-1',
  name: 'Sembradora John Deere',
  brand: 'John Deere',
  status: MachineStatus.ACTIVA,
  entryDate: new Date('2023-03-01T00:00:00.000Z'),
  maintenanceDate: null,
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

describe('MachineService', () => {
  let service: MachineService;
  let machineRepository: any;
  let companyRepository: any;

  beforeEach(async () => {
    machineRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MachineService,
        { provide: MACHINE_REPOSITORY, useValue: machineRepository },
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
      ],
    }).compile();

    service = moduleRef.get<MachineService>(MachineService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      machineRepository.findAll.mockResolvedValue([baseMachine]);

      const result = await service.findAll();

      expect(result).toEqual([baseMachine]);
      expect(machineRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error fetching machines"', async () => {
      machineRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow(
        'Error fetching machines',
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);

      const result = await service.findOne(baseMachine.id);

      expect(result).toEqual(baseMachine);
      expect(machineRepository.findById).toHaveBeenCalledWith(baseMachine.id);
    });

    it('debería envolver errores inesperados en 500 "Error fetching machine"', async () => {
      machineRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.findOne(baseMachine.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseMachine.id)).rejects.toThrow(
        'Error fetching machine',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      companyId: 'company-uuid-1',
      name: 'Tractor Massey Ferguson',
      brand: 'Massey Ferguson',
      entryDate: '2023-05-15T10:00:00.000Z',
    };

    it('debería validar la empresa, normalizar la fecha y crear', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      const created = { ...baseMachine, ...validBody, id: 'machine-uuid-2' };
      machineRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
      expect(machineRepository.create).toHaveBeenCalledWith({
        companyId: 'company-uuid-1',
        name: 'Tractor Massey Ferguson',
        brand: 'Massey Ferguson',
        entryDate: '2023-05-15T10:00:00.000Z',
      });
      expect(result).toEqual(created);
    });

    it('debería lanzar 500 "Error creating machine" si falta un campo y NO llamar al puerto', async () => {
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        'Error creating machine',
      );
      expect(companyRepository.findById).not.toHaveBeenCalled();
      expect(machineRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine" si la empresa no existe y NO llamar al puerto', async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine',
      );
      expect(machineRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine" si la fecha es inválida y NO llamar al puerto', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);

      await expect(
        service.create({ ...validBody, entryDate: 'no-es-una-fecha' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create({ ...validBody, entryDate: 'no-es-una-fecha' }),
      ).rejects.toThrow('Error creating machine');
      expect(machineRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lectura de empresa en 500 "Error creating machine" (cross-read DENTRO del try)', async () => {
      companyRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine',
      );
      expect(machineRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados del create en 500 "Error creating machine"', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      machineRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos cuando existe', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      const updated = { ...baseMachine, name: 'Sembradora Renombrada' };
      machineRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseMachine.id, {
        name: 'Sembradora Renombrada',
      });

      expect(machineRepository.findById).toHaveBeenCalledWith(baseMachine.id);
      expect(machineRepository.update).toHaveBeenCalledWith(baseMachine.id, {
        name: 'Sembradora Renombrada',
      });
      expect(result).toEqual(updated);
    });

    it('debería normalizar entryDate a ISO dentro del updateData', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      const updated = {
        ...baseMachine,
        entryDate: new Date('2023-06-01T00:00:00.000Z'),
      };
      machineRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseMachine.id, {
        entryDate: '2023-06-01T00:00:00.000Z',
      });

      expect(machineRepository.update).toHaveBeenCalledWith(baseMachine.id, {
        entryDate: '2023-06-01T00:00:00.000Z',
      });
      expect(result).toEqual(updated);
    });

    it('debería lanzar 500 "Error updating machine" si no existe y NO llamar al update', async () => {
      machineRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update('missing-uuid', { name: 'X' }),
      ).rejects.toThrow('Error updating machine');
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error updating machine" si entryDate es inválida y NO llamar al update', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);

      await expect(
        service.update(baseMachine.id, { entryDate: 'no-es-una-fecha' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseMachine.id, { entryDate: 'no-es-una-fecha' }),
      ).rejects.toThrow('Error updating machine');
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error updating machine" si maintenanceDate es inválida y NO llamar al update', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);

      await expect(
        service.update(baseMachine.id, { maintenanceDate: 'no-es-una-fecha' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseMachine.id, { maintenanceDate: 'no-es-una-fecha' }),
      ).rejects.toThrow('Error updating machine');
      expect(machineRepository.update).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lectura en 500 "Error updating machine"', async () => {
      machineRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseMachine.id, { name: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseMachine.id, { name: 'X' }),
      ).rejects.toThrow('Error updating machine');
    });

    it('debería envolver el rechazo del update del puerto en 500 "Error updating machine"', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      machineRepository.update.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseMachine.id, { name: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseMachine.id, { name: 'X' }),
      ).rejects.toThrow('Error updating machine');
    });
  });
});
