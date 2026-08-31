import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
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

const baseTaskWithOperators = {
  ...baseTask,
  operators: [{ id: 'user-1' }],
};

function createPorts() {
  return {
    repository: {
      findAllByCompanyId: jest.fn(),
      findByIdForCompany: jest.fn(),
      findByIdWithOperatorsForCompany: jest.fn(),
      create: jest.fn(),
      updateForCompany: jest.fn(),
      addOperatorForCompany: jest.fn(),
      removeOperatorForCompany: jest.fn(),
      deleteForCompany: jest.fn(),
    },
    lotReader: {
      findByIdForCompany: jest.fn(),
    },
    taskTypeReader: {
      findByIdForCompany: jest.fn(),
    },
    userReader: {
      findByIdForCompany: jest.fn(),
    },
  };
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
    it('returns only tasks for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseTask]);

      const useCase: any = new FindAllTasksUseCase(repository as never);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseTask]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when there are no tasks', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase: any = new FindAllTasksUseCase(repository as never);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindTaskUseCase', () => {
    it('returns a task by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseTask);

      const useCase: any = new FindTaskUseCase(repository as never);

      await expect(useCase.execute('task-1', 'company-1')).resolves.toEqual(baseTask);
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('task-1', 'company-1');
    });

    it('rejects missing tasks outside the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase: any = new FindTaskUseCase(repository as never);

      await expect(useCase.execute('task-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('task-1', 'company-2');
    });
  });

  describe('CreateTaskUseCase', () => {
    let repository: any;
    let lotReader: any;
    let taskTypeReader: any;
    let useCase: any;

    beforeEach(() => {
      ({ repository, lotReader, taskTypeReader } = createPorts());
      useCase = new CreateTaskUseCase(repository as never, lotReader as never, taskTypeReader as never);
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

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects invalid startedAt', async () => {
      await expect(
        useCase.execute('company-1', {
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects a lot that belongs to another company', async () => {
      lotReader.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', {
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: '2026-01-10',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(lotReader.findByIdForCompany).toHaveBeenCalledWith('lot-1', 'company-1');
    });

    it('rejects a task type that belongs to another company', async () => {
      lotReader.findByIdForCompany.mockResolvedValue({ id: 'lot-1' });
      taskTypeReader.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', {
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: '2026-01-10',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(taskTypeReader.findByIdForCompany).toHaveBeenCalledWith(
        'task-type-1',
        'company-1',
      );
    });

    it('creates a task with company-scoped relations', async () => {
      lotReader.findByIdForCompany.mockResolvedValue({ id: 'lot-1' });
      taskTypeReader.findByIdForCompany.mockResolvedValue({ id: 'task-type-1' });
      repository.create.mockResolvedValue(baseTask);

      await expect(
        useCase.execute('company-1', {
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          startedAt: '2026-01-10',
        }),
      ).resolves.toEqual(baseTask);

      expect(lotReader.findByIdForCompany).toHaveBeenCalledWith('lot-1', 'company-1');
      expect(taskTypeReader.findByIdForCompany).toHaveBeenCalledWith(
        'task-type-1',
        'company-1',
      );
      expect(repository.create).toHaveBeenCalledWith({
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: new Date('2026-01-10'),
      });
    });
  });

  describe('UpdateTaskUseCase', () => {
    let repository: any;
    let useCase: any;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateTaskUseCase(repository as never);
    });

    it.each([undefined, {}])('rejects empty update payload %p', async (input) => {
      await expect(useCase.execute('task-1', 'company-1', input as UpdateTaskInput)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects missing task in the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'company-2', { status: 'EN_PROGRESO' })).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('task-1', 'company-2');
    });

    it('updates a task within the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTask);
      repository.updateForCompany.mockResolvedValue({
        ...baseTask,
        status: 'EN_PROGRESO',
      });

      await expect(
        useCase.execute('task-1', 'company-1', {
          status: 'EN_PROGRESO',
          startedAt: '2026-01-15',
          finishedAt: '2026-01-16',
        }),
      ).resolves.toEqual({
        ...baseTask,
        status: 'EN_PROGRESO',
      });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('task-1', 'company-1');
      expect(repository.updateForCompany).toHaveBeenCalledWith('task-1', 'company-1', {
        status: 'EN_PROGRESO',
        startedAt: new Date('2026-01-15'),
        finishedAt: new Date('2026-01-16'),
      });
    });
  });

  describe('AddTaskOperatorUseCase', () => {
    let repository: any;
    let userReader: any;
    let useCase: any;

    beforeEach(() => {
      ({ repository, userReader } = createPorts());
      useCase = new (AddTaskOperatorUseCase as any)(repository as never, userReader as never);
    });

    it('rejects a missing task', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('rejects a missing or foreign operator', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        InvalidRelationError,
      );

      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        InvalidRelationError,
      );
    });

    it('rejects duplicate operators', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue(baseTaskWithOperators);
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        DuplicateEntityError,
      );
    });

    it('adds an operator to a task within the current company', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).resolves.toEqual({
        message: 'Operator with id user-1 added to task with id task-1 successfully',
      });

      expect(repository.findByIdWithOperatorsForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
      );
      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.addOperatorForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
        'user-1',
      );
    });
  });

  describe('RemoveTaskOperatorUseCase', () => {
    let repository: any;
    let userReader: any;
    let useCase: any;

    beforeEach(() => {
      ({ repository, userReader } = createPorts());
      useCase = new (RemoveTaskOperatorUseCase as any)(repository as never, userReader as never);
    });

    it('rejects a missing task', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('rejects a missing or foreign operator', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        InvalidRelationError,
      );
    });

    it('rejects an unassigned operator', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue({
        ...baseTask,
        operators: [],
      });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });

    it('removes an operator from a task within the current company', async () => {
      repository.findByIdWithOperatorsForCompany.mockResolvedValue(baseTaskWithOperators);
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

      await expect(useCase.execute('task-1', 'user-1', 'company-1')).resolves.toEqual({
        message: 'Operator with id user-1 removed from task with id task-1 successfully',
      });

      expect(repository.findByIdWithOperatorsForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
      );
      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.removeOperatorForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
        'user-1',
      );
    });
  });

  describe('DeleteTaskUseCase', () => {
    let repository: any;
    let useCase: any;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new DeleteTaskUseCase(repository as never);
    });

    it('rejects a missing task', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.deleteForCompany).not.toHaveBeenCalled();
    });

    it('deletes a task and returns legacy message', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTask);

      await expect(useCase.execute('task-1', 'company-1')).resolves.toEqual({
        message: 'Task with id task-1 deleted successfully',
      });
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('task-1', 'company-1');
      expect(repository.deleteForCompany).toHaveBeenCalledWith('task-1', 'company-1');
    });
  });
});
