import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { LotReaderPort, TaskRepositoryPort, TaskTypeReaderPort, UserReaderPort } from '../task.ports';
import { CreateTaskInput, TaskStatusValue, UpdateTaskInput } from '../task.types';
import { AddTaskOperatorUseCase } from './add-task-operator.use-case';
import { CreateTaskUseCase } from './create-task.use-case';
import { DeleteTaskUseCase } from './delete-task.use-case';
import { FindAllTasksUseCase } from './find-all-tasks.use-case';
import { FindTaskUseCase } from './find-task.use-case';
import { RemoveTaskOperatorUseCase } from './remove-task-operator.use-case';
import { UpdateTaskUseCase } from './update-task.use-case';

const baseTask = {
  id: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  status: 'PENDIENTE' as TaskStatusValue,
  startedAt: new Date('2026-01-10T00:00:00.000Z'),
  finishedAt: null,
  updatedTaskAt: null,
  createdAt: new Date('2026-01-11T00:00:00.000Z'),
  updatedAt: new Date('2026-01-12T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<TaskRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithOperators: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addOperator: jest.fn(),
    removeOperator: jest.fn(),
    delete: jest.fn(),
  };

  const lotReader: jest.Mocked<LotReaderPort> = {
    findById: jest.fn(),
  };

  const taskTypeReader: jest.Mocked<TaskTypeReaderPort> = {
    findById: jest.fn(),
  };

  const userReader: jest.Mocked<UserReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, lotReader, taskTypeReader, userReader };
}

describe('Task use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/task');
    const files = [
      'domain/errors.ts',
      'application/task.ports.ts',
      'application/task.types.ts',
      'application/task.validation.ts',
      'application/use-cases/add-task-operator.use-case.ts',
      'application/use-cases/create-task.use-case.ts',
      'application/use-cases/delete-task.use-case.ts',
      'application/use-cases/find-all-tasks.use-case.ts',
      'application/use-cases/find-task.use-case.ts',
      'application/use-cases/remove-task-operator.use-case.ts',
      'application/use-cases/update-task.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllTasksUseCase', () => {
    it('returns all tasks', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseTask]);

      const useCase = new FindAllTasksUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseTask]);
    });

    it('returns an empty list when there are no tasks', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllTasksUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindTaskUseCase', () => {
    it('returns a task by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseTask);

      const useCase = new FindTaskUseCase(repository);

      await expect(useCase.execute('task-1')).resolves.toEqual(baseTask);
    });

    it('rejects missing tasks', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindTaskUseCase(repository);

      await expect(useCase.execute('task-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });
  });

  describe('CreateTaskUseCase', () => {
    let repository: jest.Mocked<TaskRepositoryPort>;
    let lotReader: jest.Mocked<LotReaderPort>;
    let taskTypeReader: jest.Mocked<TaskTypeReaderPort>;
    let useCase: CreateTaskUseCase;

    beforeEach(() => {
      ({ repository, lotReader, taskTypeReader } = createPorts());
      useCase = new CreateTaskUseCase(repository, lotReader, taskTypeReader);
    });

    it.each([
      ['lotId', undefined],
      ['taskTypeId', undefined],
      ['startedAt', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateTaskInput = {
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: '2026-01-10',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects invalid startedAt', async () => {
      await expect(
        useCase.execute({
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing lot or task type', async () => {
      lotReader.findById.mockResolvedValue(null);
      taskTypeReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: '2026-01-10',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('creates a task', async () => {
      lotReader.findById.mockResolvedValue({ id: 'lot-1' });
      taskTypeReader.findById.mockResolvedValue({ id: 'task-type-1' });
      repository.create.mockResolvedValue(baseTask);

      await expect(
        useCase.execute({
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: '2026-01-10',
        }),
      ).resolves.toEqual(baseTask);

      expect(repository.create).toHaveBeenCalledWith({
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: new Date('2026-01-10'),
      });
    });
  });

  describe('UpdateTaskUseCase', () => {
    let repository: jest.Mocked<TaskRepositoryPort>;
    let useCase: UpdateTaskUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateTaskUseCase(repository);
    });

    it.each([undefined, {}])('rejects empty update payload %p', async (input) => {
      await expect(
        useCase.execute('task-1', input as UpdateTaskInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing task', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('task-1', { status: 'EN_PROGRESO' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects invalid status and dates', async () => {
      repository.findById.mockResolvedValue(baseTask);

      await expect(
        useCase.execute('task-1', {
          status: 'NO_EXISTE' as TaskStatusValue,
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      await expect(
        useCase.execute('task-1', { startedAt: 'not-a-date' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates a task', async () => {
      repository.findById.mockResolvedValue(baseTask);
      repository.update.mockResolvedValue({
        ...baseTask,
        status: 'EN_PROGRESO',
      });

      await expect(
        useCase.execute('task-1', {
          status: 'EN_PROGRESO',
          startedAt: '2026-01-15',
          finishedAt: '2026-01-16',
        }),
      ).resolves.toEqual({
        ...baseTask,
        status: 'EN_PROGRESO',
      });

      expect(repository.update).toHaveBeenCalledWith('task-1', {
        status: 'EN_PROGRESO',
        startedAt: new Date('2026-01-15'),
        finishedAt: new Date('2026-01-16'),
      });
    });
  });

  describe('AddTaskOperatorUseCase', () => {
    let repository: jest.Mocked<TaskRepositoryPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: AddTaskOperatorUseCase;

    beforeEach(() => {
      ({ repository, userReader } = createPorts());
      useCase = new AddTaskOperatorUseCase(repository, userReader);
    });

    it('rejects a missing task', async () => {
      repository.findByIdWithOperators.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('rejects a missing operator or wrong role', async () => {
      repository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findById.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      userReader.findById.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('rejects duplicate operators', async () => {
      repository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [{ id: 'user-1' }],
      });
      userReader.findById.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        DuplicateEntityError,
      );
    });

    it('adds an operator to a task', async () => {
      repository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findById.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1')).resolves.toEqual({
        message: 'Operator with id user-1 added to task with id task-1 successfully',
      });

      expect(repository.addOperator).toHaveBeenCalledWith('task-1', 'user-1');
    });
  });

  describe('RemoveTaskOperatorUseCase', () => {
    let repository: jest.Mocked<TaskRepositoryPort>;
    let useCase: RemoveTaskOperatorUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new RemoveTaskOperatorUseCase(repository);
    });

    it('rejects a missing task', async () => {
      repository.findByIdWithOperators.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('rejects an unassigned operator', async () => {
      repository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [],
      });

      await expect(useCase.execute('task-1', 'user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('removes an operator from a task', async () => {
      repository.findByIdWithOperators.mockResolvedValue({
        ...baseTask,
        operators: [{ id: 'user-1' }],
      });

      await expect(useCase.execute('task-1', 'user-1')).resolves.toEqual({
        message: 'Operator with id user-1 removed from task with id task-1 successfully',
      });

      expect(repository.removeOperator).toHaveBeenCalledWith('task-1', 'user-1');
    });
  });

  describe('DeleteTaskUseCase', () => {
    let repository: jest.Mocked<TaskRepositoryPort>;
    let useCase: DeleteTaskUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new DeleteTaskUseCase(repository);
    });

    it('rejects a missing task', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('task-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a task and returns legacy message', async () => {
      repository.findById.mockResolvedValue(baseTask);

      await expect(useCase.execute('task-1')).resolves.toEqual({
        message: 'Task with id task-1 deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith('task-1');
    });
  });
});
