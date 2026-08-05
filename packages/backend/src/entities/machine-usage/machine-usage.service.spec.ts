import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { MachineUsageService } from './machine-usage.service';
import { MACHINE_USAGE_REPOSITORY } from './ports/machine-usage.repository';
import { MACHINE_REPOSITORY } from '../machine/ports/machine.repository';
import { TASK_REPOSITORY } from '../task/ports/task.repository';
import { USER_REPOSITORY } from '../user/ports/user.repository';
import { MachineStatus } from '../machine/domain/machine-status';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual
// de machine-usage contra puertos mockeados (plain objects + jest.fn()).
// RED por diseño: ./ports/machine-usage.repository no existe aún (T-F2-59).
// Notas de contrato (verificadas contra el legacy):
// 1) Al igual que machine, TODAS las validaciones y lecturas cruzadas corren
//    DENTRO del try/catch y el catch general REEMPLAZA los throws internos:
//    el mensaje observable de CUALQUIER fallo de create/update es el genérico
//    ('Error creating/updating machine usage'). Los mensajes internos legacy
//    ('Missing required fields...', 'Machine, task, or operator not found',
//    'Operator is not assigned to the task', 'Machine esta en mantenimiento o
//    inactiva', 'Machine usage with id X not found') quedan swalloweados; el
//    spec los congela como FLUJO (qué puerto se llama y qué NO) con el mensaje
//    genérico observable.
// 2) Divergencia consciente (REQ-A-01, precedente T-F2-41): el legacy escribía
//    `intialFuel` (typo) pero el schema Prisma tiene `initialFuel` (schema.prisma
//    línea 138) — el create legacy SIEMPRE fallaba con P2009 unknown argument →
//    500. El puerto/refactor usa `initialFuel` (el adapter no compila con el
//    typo) y el create pasa a ser efectivo. El check de required del legacy NO
//    incluía intialFuel (solo machineId/taskId/operatorId) — se preserva.
// 3) El orden de las lecturas del create es SECUENCIAL en el legacy (machine →
//    task → operator): si la primera rechaza, las siguientes NO se llaman.
// 4) findOne devuelve null si no existe (sin 404). update con data vacío pasa
//    updateData {} al puerto (sin 400 'No data provided').

const baseUsage = {
  id: 'usage-uuid-1',
  taskId: 'task-uuid-1',
  machineId: 'machine-uuid-1',
  initialFuel: 50.5,
  finalFuel: 20.25,
  usageHours: 3.5,
  observations: 'Sin novedades',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

const baseMachine = {
  id: 'machine-uuid-1',
  companyId: 'company-uuid-1',
  name: 'Tractor Massey Ferguson',
  brand: 'Massey Ferguson',
  status: MachineStatus.ACTIVA,
  entryDate: new Date('2023-03-01T00:00:00.000Z'),
  maintenanceDate: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseTask = {
  id: 'task-uuid-1',
  taskTypeId: 'task-type-uuid-1',
  lotId: 'lot-uuid-1',
  startedAt: new Date('2024-02-01T08:00:00.000Z'),
  operators: [{ id: 'operator-uuid-1' }],
};

const baseOperator = {
  id: 'operator-uuid-1',
  companyId: 'company-uuid-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@example.com',
  username: 'juanperez',
  passwordHash: 'hash',
  role: 'OPERARIO',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('MachineUsageService', () => {
  let service: MachineUsageService;
  let machineUsageRepository: any;
  let machineRepository: any;
  let taskRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    machineUsageRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    machineRepository = {
      findById: jest.fn(),
    };

    taskRepository = {
      findByIdWithOperators: jest.fn(),
    };

    userRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MachineUsageService,
        { provide: MACHINE_USAGE_REPOSITORY, useValue: machineUsageRepository },
        { provide: MACHINE_REPOSITORY, useValue: machineRepository },
        { provide: TASK_REPOSITORY, useValue: taskRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    service = moduleRef.get<MachineUsageService>(MachineUsageService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      machineUsageRepository.findAll.mockResolvedValue([baseUsage]);

      const result = await service.findAll();

      expect(result).toEqual([baseUsage]);
      expect(machineUsageRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error finding all machine usages"', async () => {
      machineUsageRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow(
        'Error finding all machine usages',
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      machineUsageRepository.findById.mockResolvedValue(baseUsage);

      const result = await service.findOne(baseUsage.id);

      expect(result).toEqual(baseUsage);
      expect(machineUsageRepository.findById).toHaveBeenCalledWith(
        baseUsage.id,
      );
    });

    it('debería retornar null si no existe (sin 404)', async () => {
      machineUsageRepository.findById.mockResolvedValue(null);

      const result = await service.findOne('missing-uuid');

      expect(result).toBeNull();
    });

    it('debería envolver errores inesperados en 500 "Error finding machine usage"', async () => {
      machineUsageRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.findOne(baseUsage.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseUsage.id)).rejects.toThrow(
        'Error finding machine usage',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      machineId: 'machine-uuid-1',
      taskId: 'task-uuid-1',
      operatorId: 'operator-uuid-1',
      initialFuel: 40,
    };

    it('debería validar máquina/tarea/operario (secuencial), operario en tarea y máquina ACTIVA, y crear', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockResolvedValue(baseTask);
      userRepository.findById.mockResolvedValue(baseOperator);
      const created = {
        ...baseUsage,
        machineId: validBody.machineId,
        taskId: validBody.taskId,
        initialFuel: validBody.initialFuel,
      };
      machineUsageRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(machineRepository.findById).toHaveBeenCalledWith(
        validBody.machineId,
      );
      expect(taskRepository.findByIdWithOperators).toHaveBeenCalledWith(
        validBody.taskId,
      );
      expect(userRepository.findById).toHaveBeenCalledWith(
        validBody.operatorId,
      );
      expect(machineUsageRepository.create).toHaveBeenCalledWith({
        machineId: validBody.machineId,
        taskId: validBody.taskId,
        initialFuel: validBody.initialFuel,
      });
      expect(result).toEqual(created);
    });

    it('debería lanzar 500 "Error creating machine usage" si falta un campo y NO llamar a ningún puerto', async () => {
      await expect(
        service.create({ ...validBody, machineId: '' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create({ ...validBody, machineId: '' }),
      ).rejects.toThrow('Error creating machine usage');
      expect(machineRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.findByIdWithOperators).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine usage" si la máquina no existe y NO llamar al create', async () => {
      machineRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine usage" si la tarea no existe y NO llamar al create', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine usage" si el operario no existe y NO llamar al create', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockResolvedValue(baseTask);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine usage" si el operario NO está asignado a la tarea', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [{ id: 'other-operator-uuid' }],
      });
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 500 "Error creating machine usage" si la máquina no está ACTIVA', async () => {
      machineRepository.findById.mockResolvedValue({
        ...baseMachine,
        status: MachineStatus.MANTENIMIENTO,
      });
      taskRepository.findByIdWithOperators.mockResolvedValue(baseTask);
      userRepository.findById.mockResolvedValue(baseOperator);

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería NO llamar a las lecturas siguientes si la primera rechaza (orden secuencial)', async () => {
      machineRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(taskRepository.findByIdWithOperators).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lectura de tarea en 500 "Error creating machine usage"', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
      expect(machineUsageRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados del create en 500 "Error creating machine usage"', async () => {
      machineRepository.findById.mockResolvedValue(baseMachine);
      taskRepository.findByIdWithOperators.mockResolvedValue(baseTask);
      userRepository.findById.mockResolvedValue(baseOperator);
      machineUsageRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating machine usage',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos cuando existe', async () => {
      machineUsageRepository.findById.mockResolvedValue(baseUsage);
      const updated = { ...baseUsage, observations: 'Cambio de aceite' };
      machineUsageRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseUsage.id, {
        observations: 'Cambio de aceite',
      });

      expect(machineUsageRepository.findById).toHaveBeenCalledWith(
        baseUsage.id,
      );
      expect(machineUsageRepository.update).toHaveBeenCalledWith(baseUsage.id, {
        observations: 'Cambio de aceite',
      });
      expect(result).toEqual(updated);
    });

    it('debería pasar updateData vacío si el body no trae campos (sin 400)', async () => {
      machineUsageRepository.findById.mockResolvedValue(baseUsage);
      machineUsageRepository.update.mockResolvedValue(baseUsage);

      const result = await service.update(baseUsage.id, {});

      expect(machineUsageRepository.update).toHaveBeenCalledWith(
        baseUsage.id,
        {},
      );
      expect(result).toEqual(baseUsage);
    });

    it('debería lanzar 500 "Error updating machine usage" si no existe y NO llamar al update', async () => {
      machineUsageRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { observations: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update('missing-uuid', { observations: 'X' }),
      ).rejects.toThrow('Error updating machine usage');
      expect(machineUsageRepository.update).not.toHaveBeenCalled();
    });

    it('debería envolver el rechazo de la lectura en 500 "Error updating machine usage"', async () => {
      machineUsageRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseUsage.id, { observations: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseUsage.id, { observations: 'X' }),
      ).rejects.toThrow('Error updating machine usage');
    });

    it('debería envolver el rechazo del update del puerto en 500 "Error updating machine usage"', async () => {
      machineUsageRepository.findById.mockResolvedValue(baseUsage);
      machineUsageRepository.update.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseUsage.id, { observations: 'X' }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseUsage.id, { observations: 'X' }),
      ).rejects.toThrow('Error updating machine usage');
    });
  });
});
