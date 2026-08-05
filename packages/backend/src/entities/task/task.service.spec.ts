import { TaskService } from './task.service';
import { TaskStatus } from './domain/task-status';

// Contract-locking spec (T-F2-41) — congela el contrato del refactor hexagonal
// de task. Sin try/catch propio: la firma del constructor exige los 4 puertos
// (TASK_REPOSITORY, TASK_TYPE_LOOKUP, LOT_REPOSITORY, USER_REPOSITORY) y el
// comportamiento wrap-vs-raw de cada método queda fijado aquí ANTES de tocar el
// service (D1: el check de taskType vive en un capability port estrecho porque
// task-type aún no está extraído — REQ-F2-03).

describe('TaskService', () => {
  let service: TaskService;

  const taskRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithOperators: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addOperator: jest.fn(),
    removeOperator: jest.fn(),
    delete: jest.fn(),
  };

  const taskTypeLookup = {
    findById: jest.fn(),
  };

  const lotRepository = {
    findById: jest.fn(),
  };

  const userRepository = {
    findById: jest.fn(),
  };

  const operatorRef = (id: string) => ({ id });

  beforeEach(() => {
    jest.clearAllMocks();

    service = new TaskService(
      taskRepository as any,
      taskTypeLookup,
      lotRepository as any,
      userRepository as any,
    );
  });

  const taskFixture = {
    id: 'task-1',
    lotId: 'lot-1',
    taskTypeId: 'task-type-1',
    status: 'PENDIENTE',
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    finishedAt: null,
    updatedTaskAt: null,
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    updatedAt: new Date('2026-01-01T09:00:00.000Z'),
    version: 1,
    deleted: false,
  };

  describe('findAll', () => {
    it('debería devolver las tareas del puerto', async () => {
      taskRepository.findAll.mockResolvedValue([taskFixture]);

      await expect(service.findAll()).resolves.toEqual([taskFixture]);
      expect(taskRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findAll.mockRejectedValue(new Error('db down'));

      await expect(service.findAll()).rejects.toThrow('Error fetching tasks');
    });
  });

  describe('findOne', () => {
    it('debería lanzar 404 si la tarea no existe', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('task-1')).rejects.toThrow(
        'Task with id task-1 not found',
      );
    });

    it('debería devolver la tarea del puerto', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);

      await expect(service.findOne('task-1')).resolves.toEqual(taskFixture);
      expect(taskRepository.findById).toHaveBeenCalledWith('task-1');
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findById.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('task-1')).rejects.toThrow(
        'Error fetching task',
      );
    });
  });

  describe('create', () => {
    const createData = {
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      startedAt: '2026-01-01T10:00:00.000Z',
    };

    it('debería lanzar 400 si faltan campos requeridos', async () => {
      await expect(service.create({} as any)).rejects.toThrow(
        'Missing required fields: lotId, taskTypeId, startedAt',
      );
      expect(taskTypeLookup.findById).not.toHaveBeenCalled();
      expect(lotRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si el task type no existe (capability port)', async () => {
      taskTypeLookup.findById.mockResolvedValue(null);

      await expect(service.create(createData)).rejects.toThrow(
        'Task type with id task-type-1 does not exist',
      );
      expect(taskTypeLookup.findById).toHaveBeenCalledWith('task-type-1');
      expect(lotRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si el lot no existe', async () => {
      taskTypeLookup.findById.mockResolvedValue({ id: 'task-type-1' });
      lotRepository.findById.mockResolvedValue(null);

      await expect(service.create(createData)).rejects.toThrow(
        'Lot with id lot-1 does not exist',
      );
      expect(lotRepository.findById).toHaveBeenCalledWith('lot-1');
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si startedAt no es una fecha válida', async () => {
      taskTypeLookup.findById.mockResolvedValue({ id: 'task-type-1' });
      lotRepository.findById.mockResolvedValue({ id: 'lot-1' });

      await expect(
        service.create({ ...createData, startedAt: 'not-a-date' }),
      ).rejects.toThrow('Invalid date format for startedAt');
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('debería crear la tarea validando task type y lot', async () => {
      taskTypeLookup.findById.mockResolvedValue({ id: 'task-type-1' });
      lotRepository.findById.mockResolvedValue({ id: 'lot-1' });
      taskRepository.create.mockResolvedValue(taskFixture);

      await expect(service.create(createData)).resolves.toEqual(taskFixture);
      expect(taskTypeLookup.findById).toHaveBeenCalledWith('task-type-1');
      expect(lotRepository.findById).toHaveBeenCalledWith('lot-1');
      expect(taskRepository.create).toHaveBeenCalledWith({
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: new Date('2026-01-01T10:00:00.000Z'),
      });
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskTypeLookup.findById.mockResolvedValue({ id: 'task-type-1' });
      lotRepository.findById.mockResolvedValue({ id: 'lot-1' });
      taskRepository.create.mockRejectedValue(new Error('db down'));

      await expect(service.create(createData)).rejects.toThrow(
        'Error creating task',
      );
    });
  });

  describe('update', () => {
    it('debería lanzar 404 si la tarea no existe', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('task-1', { status: TaskStatus.EN_PROGRESO }),
      ).rejects.toThrow('Task with id task-1 not found');
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si status no es un valor válido', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);

      await expect(
        service.update('task-1', { status: 'INVALID_STATUS' as any }),
      ).rejects.toThrow(
        'Invalid status value. Allowed values are: PENDIENTE, EN_PROGRESO, FINALIZADA, CANCELADA',
      );
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si startedAt no es una fecha válida', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);

      await expect(
        service.update('task-1', { startedAt: 'not-a-date' }),
      ).rejects.toThrow('startedAt must be a valid date');
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si finishedAt no es una fecha válida', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);

      await expect(
        service.update('task-1', { finishedAt: 'not-a-date' }),
      ).rejects.toThrow('finishedAt must be a valid date');
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 si no se provee ningún dato', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);

      await expect(service.update('task-1', {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('debería actualizar con los campos provistos', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);
      taskRepository.update.mockResolvedValue({
        ...taskFixture,
        status: TaskStatus.EN_PROGRESO,
      });

      await expect(
        service.update('task-1', { status: TaskStatus.EN_PROGRESO }),
      ).resolves.toEqual({ ...taskFixture, status: TaskStatus.EN_PROGRESO });
      expect(taskRepository.update).toHaveBeenCalledWith('task-1', {
        status: TaskStatus.EN_PROGRESO,
      });
    });

    it('debería convertir las fechas string a Date al actualizar', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);
      taskRepository.update.mockResolvedValue(taskFixture);

      await service.update('task-1', {
        startedAt: '2026-02-01T10:00:00.000Z',
        finishedAt: '2026-02-02T10:00:00.000Z',
      });

      expect(taskRepository.update).toHaveBeenCalledWith('task-1', {
        startedAt: new Date('2026-02-01T10:00:00.000Z'),
        finishedAt: new Date('2026-02-02T10:00:00.000Z'),
      });
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);
      taskRepository.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('task-1', { status: TaskStatus.EN_PROGRESO }),
      ).rejects.toThrow('Error updating task');
    });
  });

  describe('addOperario', () => {
    it('debería lanzar 404 si la tarea no existe', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue(null);

      await expect(service.addOperario('task-1', 'user-1')).rejects.toThrow(
        'Task with id task-1 not found',
      );
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.addOperator).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 si el operator no existe o no es OPERARIO', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [],
      });
      userRepository.findById.mockResolvedValue(null);

      await expect(service.addOperario('task-1', 'user-1')).rejects.toThrow(
        'Operator with id user-1 not found',
      );
      expect(taskRepository.addOperator).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 si el usuario existe pero no tiene rol OPERARIO', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [],
      });
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        role: 'PRODUCTOR',
      });

      await expect(service.addOperario('task-1', 'user-1')).rejects.toThrow(
        'Operator with id user-1 not found',
      );
      expect(taskRepository.addOperator).not.toHaveBeenCalled();
    });

    it('debería lanzar 409 si el operator ya está asignado', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [operatorRef('user-1')],
      });
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        role: 'OPERARIO',
      });

      await expect(service.addOperario('task-1', 'user-1')).rejects.toThrow(
        'Operator with id user-1 is already assigned to task with id task-1',
      );
      expect(taskRepository.addOperator).not.toHaveBeenCalled();
    });

    it('debería asignar el operator y devolver el mensaje', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [],
      });
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        role: 'OPERARIO',
      });
      taskRepository.addOperator.mockResolvedValue(undefined);

      await expect(service.addOperario('task-1', 'user-1')).resolves.toEqual({
        message:
          'Operator with id user-1 added to task with id task-1 successfully',
      });
      expect(taskRepository.addOperator).toHaveBeenCalledWith(
        'task-1',
        'user-1',
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [],
      });
      userRepository.findById.mockResolvedValue({
        id: 'user-1',
        role: 'OPERARIO',
      });
      taskRepository.addOperator.mockRejectedValue(new Error('db down'));

      await expect(service.addOperario('task-1', 'user-1')).rejects.toThrow(
        'Error adding operator to task',
      );
    });
  });

  describe('removeOperario', () => {
    it('debería lanzar 404 si la tarea no existe', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue(null);

      await expect(service.removeOperario('task-1', 'user-1')).rejects.toThrow(
        'Task with id task-1 not found',
      );
      expect(taskRepository.removeOperator).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 si el operator no está asignado', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [],
      });

      await expect(service.removeOperario('task-1', 'user-1')).rejects.toThrow(
        'Operator with id user-1 is not assigned to task with id task-1',
      );
      expect(taskRepository.removeOperator).not.toHaveBeenCalled();
    });

    it('debería desasignar el operator y devolver el mensaje', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [operatorRef('user-1')],
      });
      taskRepository.removeOperator.mockResolvedValue(undefined);

      await expect(service.removeOperario('task-1', 'user-1')).resolves.toEqual(
        {
          message:
            'Operator with id user-1 removed from task with id task-1 successfully',
        },
      );
      expect(taskRepository.removeOperator).toHaveBeenCalledWith(
        'task-1',
        'user-1',
      );
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findByIdWithOperators.mockResolvedValue({
        ...taskFixture,
        operators: [operatorRef('user-1')],
      });
      taskRepository.removeOperator.mockRejectedValue(new Error('db down'));

      await expect(service.removeOperario('task-1', 'user-1')).rejects.toThrow(
        'Error removing operator from task',
      );
    });
  });

  describe('delete', () => {
    it('debería lanzar 404 si la tarea no existe', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(service.delete('task-1')).rejects.toThrow(
        'Task with id task-1 not found',
      );
      expect(taskRepository.delete).not.toHaveBeenCalled();
    });

    it('debería eliminar y devolver el mensaje', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);
      taskRepository.delete.mockResolvedValue(taskFixture);

      await expect(service.delete('task-1')).resolves.toEqual({
        message: 'Task with id task-1 deleted successfully',
      });
      expect(taskRepository.delete).toHaveBeenCalledWith('task-1');
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskRepository.findById.mockResolvedValue(taskFixture);
      taskRepository.delete.mockRejectedValue(new Error('db down'));

      await expect(service.delete('task-1')).rejects.toThrow(
        'Error deleting task',
      );
    });
  });
});
