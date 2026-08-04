import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { WeightRecordService } from './weight-record.service';
import { WEIGHT_RECORD_REPOSITORY } from './ports/weight-record.repository';
import { USER_REPOSITORY } from '../user/ports/user.repository';
import { LIVESTOCK_REPOSITORY } from '../livestock/ports/livestock.repository';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual de
// weight-record (operator/livestock-exists, parseo de measuredAt, delete-then-update
// semantics) contra puertos mockeados (plain objects + jest.fn(), sin librería de
// test-doubles).
// RED por diseño: ./ports/weight-record.repository no existe aún (se crea en T-F2-36).
// Nota wrap-vs-raw (T-F2-38, byte-identical): a diferencia de livestock-event,
// findAll y findOne NO tienen try/catch — los rechazos del puerto se propagan
// crudos y findOne devuelve null si no existe (weight-record.service.ts líneas
// 8-14). delete/update/create SÍ envuelven en 500; en create las lecturas de
// operator y livestock son SECUENCIALES y el chequeo de operator gana el 404
// cuando ambos faltan (líneas 93-102).

const baseRecord = {
  id: 'record-uuid-1',
  livestockId: 'livestock-uuid-1',
  operatorId: 'user-uuid-1',
  weight: 320.5,
  measuredAt: new Date('2024-05-10T10:00:00.000Z'),
  createdAt: new Date('2024-05-10T10:00:00.000Z'),
};

const baseLivestock = {
  id: 'livestock-uuid-1',
  companyId: 'company-uuid-1',
  lotId: null,
  tagNumber: 'A-001',
  species: 'Bovino',
  breed: 'Angus',
  sex: 'M',
  birthDate: new Date('2022-01-01T00:00:00.000Z'),
  status: 'ACTIVO',
  entryDate: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseOperator = {
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  username: 'operario1',
  email: 'operario1@example.com',
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash-de-prueba',
  role: 'OPERARIO',
  failedLoginAttempts: 0,
  lockedUntil: null,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('WeightRecordService', () => {
  let service: WeightRecordService;
  let weightRecordRepository: any;
  let userRepository: any;
  let livestockRepository: any;

  beforeEach(async () => {
    weightRecordRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    userRepository = {
      findById: jest.fn(),
    };

    livestockRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WeightRecordService,
        {
          provide: WEIGHT_RECORD_REPOSITORY,
          useValue: weightRecordRepository,
        },
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: LIVESTOCK_REPOSITORY, useValue: livestockRepository },
      ],
    }).compile();

    service = moduleRef.get<WeightRecordService>(WeightRecordService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todos los registros del puerto', async () => {
      weightRecordRepository.findAll.mockResolvedValue([baseRecord]);

      const result = await service.findAll();

      expect(weightRecordRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([baseRecord]);
    });

    it('debería propagar crudo el rechazo del puerto (sin 500-wrap)', async () => {
      weightRecordRepository.findAll.mockRejectedValue(new Error('db down'));

      await expect(service.findAll()).rejects.toThrow(new Error('db down'));
    });
  });

  describe('findOne', () => {
    it('debería retornar el registro encontrado por id', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);

      const result = await service.findOne('record-uuid-1');

      expect(weightRecordRepository.findById).toHaveBeenCalledWith(
        'record-uuid-1',
      );
      expect(result).toEqual(baseRecord);
    });

    it('debería devolver null si el registro no existe (sin 404)', async () => {
      weightRecordRepository.findById.mockResolvedValue(null);

      const result = await service.findOne('record-uuid-1');

      expect(result).toBeNull();
    });

    it('debería propagar crudo el rechazo del puerto (sin 500-wrap)', async () => {
      weightRecordRepository.findById.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('record-uuid-1')).rejects.toThrow(
        new Error('db down'),
      );
    });
  });

  describe('delete', () => {
    it('debería eliminar y devolver el mensaje de éxito', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      weightRecordRepository.delete.mockResolvedValue(baseRecord);

      const result = await service.delete('record-uuid-1');

      expect(weightRecordRepository.findById).toHaveBeenCalledWith(
        'record-uuid-1',
      );
      expect(weightRecordRepository.delete).toHaveBeenCalledWith(
        'record-uuid-1',
      );
      expect(result).toEqual({
        message: 'Weight record with id record-uuid-1 deleted successfully',
      });
    });

    it('debería lanzar 404 si el registro no existe', async () => {
      weightRecordRepository.findById.mockResolvedValue(null);

      await expect(service.delete('record-uuid-1')).rejects.toThrow(
        new NotFoundException('Weight record with id record-uuid-1 not found'),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      weightRecordRepository.delete.mockRejectedValue(new Error('db down'));

      await expect(service.delete('record-uuid-1')).rejects.toThrow(
        new InternalServerErrorException('Error deleting weight record'),
      );
    });
  });

  describe('update', () => {
    const validUpdate = {
      operatorId: 'user-uuid-1',
      weight: 330,
      measuredAt: '2024-05-11T10:00:00.000Z',
    };

    it('debería actualizar el registro con todos los campos', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      userRepository.findById.mockResolvedValue(baseOperator);
      weightRecordRepository.update.mockResolvedValue({
        ...baseRecord,
        weight: 330,
        measuredAt: new Date('2024-05-11T10:00:00.000Z'),
      });

      const result = await service.update('record-uuid-1', validUpdate);

      expect(weightRecordRepository.findById).toHaveBeenCalledWith(
        'record-uuid-1',
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(weightRecordRepository.update).toHaveBeenCalledWith(
        'record-uuid-1',
        expect.objectContaining({
          operatorId: 'user-uuid-1',
          weight: 330,
          measuredAt: new Date('2024-05-11T10:00:00.000Z'),
        }),
      );
      expect(result).toEqual({
        ...baseRecord,
        weight: 330,
        measuredAt: new Date('2024-05-11T10:00:00.000Z'),
      });
    });

    it('debería lanzar 400 si no llega data', async () => {
      await expect(service.update('record-uuid-1')).rejects.toThrow(
        new BadRequestException('No data provided for update'),
      );
    });

    it('debería lanzar 400 si data es null', async () => {
      await expect(
        service.update('record-uuid-1', null as never),
      ).rejects.toThrow(new BadRequestException('No data provided for update'));
    });

    it('debería lanzar 404 si el registro no existe', async () => {
      weightRecordRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('record-uuid-1', validUpdate),
      ).rejects.toThrow(
        new NotFoundException('Weight record with id record-uuid-1 not found'),
      );
    });

    it('debería lanzar 404 si el operator no existe', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('record-uuid-1', validUpdate),
      ).rejects.toThrow(
        new NotFoundException('Operator with id user-uuid-1 not found'),
      );
    });

    it('debería lanzar 400 si measuredAt no es una fecha válida', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(
        service.update('record-uuid-1', {
          ...validUpdate,
          measuredAt: 'fecha-invalida',
        }),
      ).rejects.toThrow(
        new BadRequestException('measuredAt must be a valid date'),
      );
    });

    it('debería lanzar 400 si todos los campos vienen vacíos', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);

      await expect(service.update('record-uuid-1', {})).rejects.toThrow(
        new BadRequestException('No data provided for update'),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      weightRecordRepository.findById.mockResolvedValue(baseRecord);
      userRepository.findById.mockResolvedValue(baseOperator);
      weightRecordRepository.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('record-uuid-1', validUpdate),
      ).rejects.toThrow(
        new InternalServerErrorException('Error updating weight record'),
      );
    });
  });

  describe('create', () => {
    const validCreate = {
      livestockId: 'livestock-uuid-1',
      operatorId: 'user-uuid-1',
      weight: 320.5,
      measuredAt: '2024-05-10T10:00:00.000Z',
    };

    it('debería crear el registro validando operator y livestock', async () => {
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      weightRecordRepository.create.mockResolvedValue(baseRecord);

      const result = await service.create(validCreate);

      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(livestockRepository.findById).toHaveBeenCalledWith(
        'livestock-uuid-1',
      );
      expect(weightRecordRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          livestockId: 'livestock-uuid-1',
          operatorId: 'user-uuid-1',
          weight: 320.5,
          measuredAt: new Date('2024-05-10T10:00:00.000Z'),
        }),
      );
      expect(result).toEqual(baseRecord);
    });

    it('debería lanzar 404 si el operator no existe (gana sobre livestock)', async () => {
      userRepository.findById.mockResolvedValue(null);
      livestockRepository.findById.mockResolvedValue(null);

      await expect(service.create(validCreate)).rejects.toThrow(
        new NotFoundException('Operator with id user-uuid-1 not found'),
      );
    });

    it('debería lanzar 404 si el livestock no existe', async () => {
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockRepository.findById.mockResolvedValue(null);

      await expect(service.create(validCreate)).rejects.toThrow(
        new NotFoundException('Livestock with id livestock-uuid-1 not found'),
      );
    });

    it('debería lanzar 400 si measuredAt no es una fecha válida', async () => {
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockRepository.findById.mockResolvedValue(baseLivestock);

      await expect(
        service.create({ ...validCreate, measuredAt: 'fecha-invalida' }),
      ).rejects.toThrow(
        new BadRequestException('measuredAt must be a valid date'),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      weightRecordRepository.create.mockRejectedValue(new Error('db down'));

      await expect(service.create(validCreate)).rejects.toThrow(
        new InternalServerErrorException('Error creating weight record'),
      );
    });
  });
});
