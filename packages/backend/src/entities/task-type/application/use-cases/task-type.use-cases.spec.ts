import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { TaskReaderPort, TaskTypeRepositoryPort } from '../task-type.ports';
import { CreateTaskTypeInput, UpdateTaskTypeInput } from '../task-type.types';
import { CreateTaskTypeUseCase } from './create-task-type.use-case';
import { DeleteTaskTypeUseCase } from './delete-task-type.use-case';
import { FindAllTaskTypesUseCase } from './find-all-task-types.use-case';
import { FindTaskTypeUseCase } from './find-task-type.use-case';
import { UpdateTaskTypeUseCase } from './update-task-type.use-case';

const baseTaskType = {
  id: 'task-type-1',
  name: 'Mantenimiento',
  description: 'Rutina de mantenimiento',
};

function createPorts() {
  const repository: jest.Mocked<TaskTypeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const taskReader: jest.Mocked<TaskReaderPort> = {
    findByIds: jest.fn(),
  };

  return { repository, taskReader };
}

describe('Task type use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/task-type');
    const files = [
      'domain/errors.ts',
      'application/task-type.ports.ts',
      'application/task-type.types.ts',
      'application/task-type.validation.ts',
      'application/use-cases/create-task-type.use-case.ts',
      'application/use-cases/delete-task-type.use-case.ts',
      'application/use-cases/find-all-task-types.use-case.ts',
      'application/use-cases/find-task-type.use-case.ts',
      'application/use-cases/update-task-type.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllTaskTypesUseCase', () => {
    it('returns all task types', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseTaskType]);

      const useCase = new FindAllTaskTypesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseTaskType]);
    });

    it('returns an empty list when there are no task types', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllTaskTypesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindTaskTypeUseCase', () => {
    it('returns a task type by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseTaskType);

      const useCase = new FindTaskTypeUseCase(repository);

      await expect(useCase.execute('task-type-1')).resolves.toEqual(baseTaskType);
    });

    it('returns null when the task type is missing', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindTaskTypeUseCase(repository);

      await expect(useCase.execute('task-type-1')).resolves.toBeNull();
    });
  });

  describe('CreateTaskTypeUseCase', () => {
    let repository: jest.Mocked<TaskTypeRepositoryPort>;
    let useCase: CreateTaskTypeUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new CreateTaskTypeUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['name', ''],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateTaskTypeInput = { name: 'Mantenimiento' };
      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects duplicate task type names', async () => {
      repository.findByName.mockResolvedValue(baseTaskType);

      await expect(
        useCase.execute({ name: 'Mantenimiento' }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates a task type', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseTaskType);

      await expect(
        useCase.execute({ name: 'Mantenimiento', description: 'Rutina de mantenimiento' }),
      ).resolves.toEqual(baseTaskType);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Mantenimiento',
        description: 'Rutina de mantenimiento',
      });
    });
  });

  describe('UpdateTaskTypeUseCase', () => {
    let repository: jest.Mocked<TaskTypeRepositoryPort>;
    let taskReader: jest.Mocked<TaskReaderPort>;
    let useCase: UpdateTaskTypeUseCase;

    beforeEach(() => {
      ({ repository, taskReader } = createPorts());
      useCase = new UpdateTaskTypeUseCase(repository, taskReader);
    });

    it.each([undefined, {}])('rejects empty update payload %p', async (input) => {
      await expect(
        useCase.execute('task-type-1', input as UpdateTaskTypeInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing task type', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('task-type-1', { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects missing task ids', async () => {
      repository.findById.mockResolvedValue(baseTaskType);
      taskReader.findByIds.mockResolvedValue([{ id: 'task-1' }]);

      await expect(
        useCase.execute('task-type-1', {
          taskIds: ['task-1', 'task-2'],
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('updates a task type', async () => {
      repository.findById.mockResolvedValue(baseTaskType);
      taskReader.findByIds.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
      repository.update.mockResolvedValue({
        ...baseTaskType,
        name: 'Nuevo nombre',
      });

      await expect(
        useCase.execute('task-type-1', {
          name: 'Nuevo nombre',
          description: 'Actualizada',
          taskIds: ['task-1', 'task-2'],
        }),
      ).resolves.toEqual({
        ...baseTaskType,
        name: 'Nuevo nombre',
      });

      expect(repository.update).toHaveBeenCalledWith('task-type-1', {
        name: 'Nuevo nombre',
        description: 'Actualizada',
        taskIds: ['task-1', 'task-2'],
      });
    });
  });

  describe('DeleteTaskTypeUseCase', () => {
    let repository: jest.Mocked<TaskTypeRepositoryPort>;
    let useCase: DeleteTaskTypeUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new DeleteTaskTypeUseCase(repository);
    });

    it('rejects a missing task type', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('task-type-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a task type and returns legacy message', async () => {
      repository.findById.mockResolvedValue(baseTaskType);

      await expect(useCase.execute('task-type-1')).resolves.toEqual({
        message: 'Task type with id task-type-1 deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith('task-type-1');
    });
  });
});
