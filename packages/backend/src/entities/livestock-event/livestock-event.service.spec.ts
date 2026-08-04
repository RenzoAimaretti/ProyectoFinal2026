import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LivestockEventService } from './livestock-event.service';
import { LIVESTOCK_EVENT_REPOSITORY } from './ports/livestock-event.repository';
import { LIVESTOCK_REPOSITORY } from '../livestock/ports/livestock.repository';
import { USER_REPOSITORY } from '../user/ports/user.repository';
import { EventType } from './domain/event-type';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual de
// livestock-event (evento-exists, livestock/operator-exists, parseo de eventDate,
// limpieza vaccine/dose según eventType) contra puertos mockeados (plain objects +
// jest.fn(), sin librería de test-doubles).
// RED por diseño: ./ports/livestock-event.repository y ./domain/event-type no existen
// aún (se crean en T-F2-31; el enum de dominio es necesario por REQ-A-04, igual que
// user-role en wave 3).
// Nota wrap-vs-raw (T-F2-33, byte-identical): TODAS las lecturas cruzadas (evento,
// livestock, operator) corren DENTRO del try/catch de cada método — sus rechazos se
// envuelven en 500 ('Error fetching/updating/creating livestock event...'); solo las
// excepciones de dominio (400/404) se re-lanzan crudas. A diferencia de weight-record,
// aquí hasta findAll/findOne envuelven en 500.

const baseEvent = {
  id: 'event-uuid-1',
  livestockId: 'livestock-uuid-1',
  operatorId: 'user-uuid-1',
  type: EventType.VACUNACION,
  observations: 'Vacuna antiaftosa',
  vaccine: 'Antiaftosa',
  dose: 5,
  eventDate: new Date('2024-05-10T10:00:00.000Z'),
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

describe('LivestockEventService', () => {
  let service: LivestockEventService;
  let livestockEventRepository: any;
  let livestockRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    livestockEventRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    livestockRepository = {
      findById: jest.fn(),
    };

    userRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LivestockEventService,
        {
          provide: LIVESTOCK_EVENT_REPOSITORY,
          useValue: livestockEventRepository,
        },
        { provide: LIVESTOCK_REPOSITORY, useValue: livestockRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    service = moduleRef.get<LivestockEventService>(LivestockEventService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todos los eventos del puerto', async () => {
      livestockEventRepository.findAll.mockResolvedValue([baseEvent]);

      const result = await service.findAll();

      expect(livestockEventRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([baseEvent]);
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      livestockEventRepository.findAll.mockRejectedValue(new Error('db down'));

      await expect(service.findAll()).rejects.toThrow(
        new InternalServerErrorException('Error fetching livestock events'),
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar el evento encontrado por id', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);

      const result = await service.findOne('event-uuid-1');

      expect(livestockEventRepository.findById).toHaveBeenCalledWith(
        'event-uuid-1',
      );
      expect(result).toEqual(baseEvent);
    });

    it('debería lanzar 404 si el evento no existe', async () => {
      livestockEventRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('event-uuid-1')).rejects.toThrow(
        new NotFoundException('Livestock event with id event-uuid-1 not found'),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      livestockEventRepository.findById.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('event-uuid-1')).rejects.toThrow(
        new InternalServerErrorException('Error fetching livestock event'),
      );
    });
  });

  describe('create', () => {
    const validCreate = {
      eventDate: '2024-05-10T10:00:00.000Z',
      eventType: EventType.VACUNACION,
      livestockId: 'livestock-uuid-1',
      operatorId: 'user-uuid-1',
      obs: 'Vacuna antiaftosa',
      vaccine: 'Antiaftosa',
      dose: 5,
    };

    it('debería crear el evento validando livestock y operator', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.create.mockResolvedValue(baseEvent);

      const result = await service.create(validCreate);

      expect(livestockRepository.findById).toHaveBeenCalledWith(
        'livestock-uuid-1',
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(livestockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventDate: new Date('2024-05-10T10:00:00.000Z'),
          type: EventType.VACUNACION,
          livestockId: 'livestock-uuid-1',
          operatorId: 'user-uuid-1',
          observations: 'Vacuna antiaftosa',
          vaccine: 'Antiaftosa',
          dose: 5,
        }),
      );
      expect(result).toEqual(baseEvent);
    });

    it('debería lanzar 400 si faltan campos requeridos', async () => {
      await expect(
        service.create({
          eventDate: '2024-05-10T10:00:00.000Z',
          eventType: EventType.VACUNACION,
          livestockId: '',
          operatorId: 'user-uuid-1',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'livestockId, operatorId, eventDate and eventType are required',
        ),
      );
    });

    it('debería lanzar 404 si el livestock no existe', async () => {
      livestockRepository.findById.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(service.create(validCreate)).rejects.toThrow(
        new NotFoundException('Livestock with id livestock-uuid-1 not found'),
      );
    });

    it('debería lanzar 404 si el operator no existe', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.create(validCreate)).rejects.toThrow(
        new NotFoundException('Operator with id user-uuid-1 not found'),
      );
    });

    it('debería lanzar 400 si eventDate no es una fecha válida', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(
        service.create({ ...validCreate, eventDate: 'fecha-invalida' }),
      ).rejects.toThrow(
        new BadRequestException('eventDate must be a valid date'),
      );
    });

    it('debería omitir vaccine y dose si eventType no es VACUNACION', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.create.mockResolvedValue({
        ...baseEvent,
        type: EventType.TRATAMIENTO,
        vaccine: null,
        dose: null,
      });

      await service.create({
        ...validCreate,
        eventType: EventType.TRATAMIENTO,
      });

      expect(livestockEventRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ vaccine: 'Antiaftosa', dose: 5 }),
      );
      expect(livestockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.TRATAMIENTO,
          livestockId: 'livestock-uuid-1',
          operatorId: 'user-uuid-1',
        }),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.create.mockRejectedValue(new Error('db down'));

      await expect(service.create(validCreate)).rejects.toThrow(
        new InternalServerErrorException('Error creating livestock event'),
      );
    });
  });

  describe('update', () => {
    const validUpdate = {
      eventDate: '2024-05-11T10:00:00.000Z',
      eventType: EventType.VACUNACION,
      livestockId: 'livestock-uuid-1',
      operatorId: 'user-uuid-1',
      obs: 'Refuerzo',
      vaccine: 'Antiaftosa',
      dose: 5,
    };

    it('debería actualizar el evento con todos los campos', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.update.mockResolvedValue({
        ...baseEvent,
        eventDate: new Date('2024-05-11T10:00:00.000Z'),
        observations: 'Refuerzo',
      });

      const result = await service.update('event-uuid-1', validUpdate);

      expect(livestockEventRepository.findById).toHaveBeenCalledWith(
        'event-uuid-1',
      );
      expect(livestockRepository.findById).toHaveBeenCalledWith(
        'livestock-uuid-1',
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(livestockEventRepository.update).toHaveBeenCalledWith(
        'event-uuid-1',
        expect.objectContaining({
          eventDate: new Date('2024-05-11T10:00:00.000Z'),
          type: EventType.VACUNACION,
          livestockId: 'livestock-uuid-1',
          operatorId: 'user-uuid-1',
          observations: 'Refuerzo',
          vaccine: 'Antiaftosa',
          dose: 5,
        }),
      );
      expect(result).toEqual({
        ...baseEvent,
        eventDate: new Date('2024-05-11T10:00:00.000Z'),
        observations: 'Refuerzo',
      });
    });

    it('debería lanzar 404 si el evento no existe', async () => {
      livestockEventRepository.findById.mockResolvedValue(null);

      await expect(service.update('event-uuid-1', validUpdate)).rejects.toThrow(
        new NotFoundException('Livestock event with id event-uuid-1 not found'),
      );
    });

    it('debería lanzar 404 si el nuevo livestock no existe', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(null);

      await expect(service.update('event-uuid-1', validUpdate)).rejects.toThrow(
        new NotFoundException('Livestock with id livestock-uuid-1 not found'),
      );
    });

    it('debería lanzar 404 si el nuevo operator no existe', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.update('event-uuid-1', validUpdate)).rejects.toThrow(
        new NotFoundException('Operator with id user-uuid-1 not found'),
      );
    });

    it('debería lanzar 400 si eventDate no es una fecha válida', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(
        service.update('event-uuid-1', {
          ...validUpdate,
          eventDate: 'fecha-invalida',
        }),
      ).rejects.toThrow(
        new BadRequestException('eventDate must be a valid date'),
      );
    });

    it('debería lanzar 400 si no llega ningún dato para actualizar', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);

      await expect(service.update('event-uuid-1', {})).rejects.toThrow(
        new BadRequestException('No data provided for update'),
      );
    });

    it('debería forzar vaccine y dose a null si eventType no es VACUNACION', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.update.mockResolvedValue(baseEvent);

      await service.update('event-uuid-1', {
        eventType: EventType.PARTO,
        vaccine: 'Antiaftosa',
        dose: 5,
      });

      expect(livestockEventRepository.update).toHaveBeenCalledWith(
        'event-uuid-1',
        expect.objectContaining({ vaccine: null, dose: null }),
      );
    });

    it('debería conservar vaccine y dose si eventType es VACUNACION', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.update.mockResolvedValue(baseEvent);

      await service.update('event-uuid-1', {
        eventType: EventType.VACUNACION,
        vaccine: 'Antiaftosa',
        dose: 5,
      });

      expect(livestockEventRepository.update).toHaveBeenCalledWith(
        'event-uuid-1',
        expect.objectContaining({ vaccine: 'Antiaftosa', dose: 5 }),
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      livestockEventRepository.findById.mockResolvedValue(baseEvent);
      livestockRepository.findById.mockResolvedValue(baseLivestock);
      userRepository.findById.mockResolvedValue(baseOperator);
      livestockEventRepository.update.mockRejectedValue(new Error('db down'));

      await expect(service.update('event-uuid-1', validUpdate)).rejects.toThrow(
        new InternalServerErrorException('Error updating livestock event'),
      );
    });
  });
});
