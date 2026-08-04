import { TaskTypeService } from './task-type.service';

// Contract-locking spec (T-F2-46) — congela el contrato del refactor hexagonal
// de task-type. El cross-read de taskIds vive en TASK_REPOSITORY exportado por
// task (T-F2-45, REQ-F2-03); la unicidad de nombre vía findByName del puerto.
// Preserva los mensajes y tipos exactos del legacy (incl. findAll/findOne que
// lanzan BadRequestException, no InternalServerError).

describe('TaskTypeService', () => {
  let service: TaskTypeService;

  const taskTypeRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const taskRepository = {
    findByIds: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new TaskTypeService(
      taskTypeRepository as any,
      taskRepository as any,
    );
  });

  const taskTypeFixture = {
    id: 'task-type-1',
    name: 'Siembra',
    description: 'Tarea de siembra',
  };

  describe('findAll', () => {
    it('debería devolver los task types del puerto', async () => {
      taskTypeRepository.findAll.mockResolvedValue([taskTypeFixture]);

      await expect(service.findAll()).resolves.toEqual([taskTypeFixture]);
      expect(taskTypeRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver el rechazo del puerto en 400', async () => {
      taskTypeRepository.findAll.mockRejectedValue(new Error('db down'));

      await expect(service.findAll()).rejects.toThrow(
        'Error fetching task types',
      );
    });
  });

  describe('findOne', () => {
    it('debería devolver null si el task type no existe', async () => {
      taskTypeRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('task-type-1')).resolves.toBeNull();
      expect(taskTypeRepository.findById).toHaveBeenCalledWith('task-type-1');
    });

    it('debería devolver el task type del puerto', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);

      await expect(service.findOne('task-type-1')).resolves.toEqual(
        taskTypeFixture,
      );
    });

    it('debería envolver el rechazo del puerto en 400', async () => {
      taskTypeRepository.findById.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('task-type-1')).rejects.toThrow(
        'Error fetching task type by ID',
      );
    });
  });

  describe('create', () => {
    it('debería lanzar 400 si falta el nombre', async () => {
      await expect(service.create({} as any)).rejects.toThrow(
        'Missing required field: name',
      );
      expect(taskTypeRepository.findByName).not.toHaveBeenCalled();
      expect(taskTypeRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 409 si el nombre ya existe', async () => {
      taskTypeRepository.findByName.mockResolvedValue(taskTypeFixture);

      await expect(service.create({ name: 'Siembra' })).rejects.toThrow(
        'Task type with this name already exists',
      );
      expect(taskTypeRepository.findByName).toHaveBeenCalledWith('Siembra');
      expect(taskTypeRepository.create).not.toHaveBeenCalled();
    });

    it('debería crear el task type validando unicidad de nombre', async () => {
      taskTypeRepository.findByName.mockResolvedValue(null);
      taskTypeRepository.create.mockResolvedValue(taskTypeFixture);

      await expect(service.create({ name: 'Siembra' })).resolves.toEqual(
        taskTypeFixture,
      );
      expect(taskTypeRepository.create).toHaveBeenCalledWith({ name: 'Siembra' });
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskTypeRepository.findByName.mockResolvedValue(null);
      taskTypeRepository.create.mockRejectedValue(new Error('db down'));

      await expect(service.create({ name: 'Siembra' })).rejects.toThrow(
        'Error creating task type',
      );
    });
  });

  describe('update', () => {
    it('debería lanzar 400 si no se provee ningún dato', async () => {
      await expect(service.update('task-type-1', {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(taskTypeRepository.findById).not.toHaveBeenCalled();
      expect(taskTypeRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 si el task type no existe', async () => {
      taskTypeRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('task-type-1', { name: 'Cosecha' }),
      ).rejects.toThrow('Task type with id task-type-1 not found');
      expect(taskTypeRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 si alguno de los taskIds no existe', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskRepository.findByIds.mockResolvedValue([{ id: 'task-1' }]);

      await expect(
        service.update('task-type-1', { taskIds: ['task-1', 'task-2'] }),
      ).rejects.toThrow('Tasks with ids task-2 not found');
      expect(taskRepository.findByIds).toHaveBeenCalledWith(['task-1', 'task-2']);
      expect(taskTypeRepository.update).not.toHaveBeenCalled();
    });

    it('debería actualizar con los campos provistos', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskTypeRepository.update.mockResolvedValue({
        ...taskTypeFixture,
        name: 'Cosecha',
      });

      await expect(
        service.update('task-type-1', { name: 'Cosecha' }),
      ).resolves.toEqual({ ...taskTypeFixture, name: 'Cosecha' });
      expect(taskTypeRepository.update).toHaveBeenCalledWith('task-type-1', {
        name: 'Cosecha',
      });
    });

    it('debería propagar los taskIds al actualizar la relación', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskRepository.findByIds.mockResolvedValue([
        { id: 'task-1' },
        { id: 'task-2' },
      ]);
      taskTypeRepository.update.mockResolvedValue(taskTypeFixture);

      await service.update('task-type-1', { taskIds: ['task-1', 'task-2'] });

      expect(taskTypeRepository.update).toHaveBeenCalledWith('task-type-1', {
        taskIds: ['task-1', 'task-2'],
      });
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskTypeRepository.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('task-type-1', { name: 'Cosecha' }),
      ).rejects.toThrow('Error updating task type');
    });
  });

  describe('delete', () => {
    it('debería lanzar 404 si el task type no existe', async () => {
      taskTypeRepository.findById.mockResolvedValue(null);

      await expect(service.delete('task-type-1')).rejects.toThrow(
        'Task type with id task-type-1 not found',
      );
      expect(taskTypeRepository.delete).not.toHaveBeenCalled();
    });

    it('debería eliminar y devolver el mensaje', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskTypeRepository.delete.mockResolvedValue(taskTypeFixture);

      await expect(service.delete('task-type-1')).resolves.toEqual({
        message: 'Task type with id task-type-1 deleted successfully',
      });
      expect(taskTypeRepository.delete).toHaveBeenCalledWith('task-type-1');
    });

    it('debería envolver el rechazo del puerto en 500', async () => {
      taskTypeRepository.findById.mockResolvedValue(taskTypeFixture);
      taskTypeRepository.delete.mockRejectedValue(new Error('db down'));

      await expect(service.delete('task-type-1')).rejects.toThrow(
        'Error deleting task type',
      );
    });
  });
});
