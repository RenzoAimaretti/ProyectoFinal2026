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
  companyId: 'company-1',
  name: 'Mantenimiento',
  description: 'Rutina de mantenimiento',
};

const otherCompanyTaskType = {
  ...baseTaskType,
  companyId: 'company-2',
  id: 'task-type-2',
};

function createPorts() {
  const repository: jest.Mocked<TaskTypeRepositoryPort> = {
    findAllByCompanyId: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByNameAndCompanyId: jest.fn(),
    findByIdsForCompany: jest.fn(),
    create: jest.fn(),
    updateForCompany: jest.fn(),
    deleteForCompany: jest.fn(),
  };

  const taskReader: jest.Mocked<TaskReaderPort> = {
    findByIdsForCompany: jest.fn(),
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
      repository.findAllByCompanyId.mockResolvedValue([baseTaskType]);

      const useCase = new FindAllTaskTypesUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseTaskType]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when there are no task types', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllTaskTypesUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindTaskTypeUseCase', () => {
    it('returns a task type by id', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseTaskType);

      const useCase = new FindTaskTypeUseCase(repository);

      await expect(useCase.execute('task-type-1', 'company-1')).resolves.toEqual(
        baseTaskType,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'task-type-1',
        'company-1',
      );
    });

    it('rejects missing task type outside the company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindTaskTypeUseCase(repository);

      await expect(useCase.execute('task-type-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'task-type-1',
        'company-2',
      );
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

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects duplicate task type names', async () => {
      repository.findByNameAndCompanyId.mockResolvedValue(baseTaskType);

      await expect(
        useCase.execute('company-1', { name: 'Mantenimiento' }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.findByNameAndCompanyId).toHaveBeenCalledWith(
        'Mantenimiento',
        'company-1',
      );
    });

    it('creates a task type', async () => {
      repository.findByNameAndCompanyId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseTaskType);

      await expect(
        useCase.execute('company-1', {
          name: 'Mantenimiento',
          description: 'Rutina de mantenimiento',
        }),
      ).resolves.toEqual(baseTaskType);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Mantenimiento',
        description: 'Rutina de mantenimiento',
        companyId: 'company-1',
      });
    });

    it('allows the same task type name in another company', async () => {
      repository.findByNameAndCompanyId.mockResolvedValue(null);
      repository.create.mockResolvedValue(otherCompanyTaskType);

      await expect(
        useCase.execute('company-2', {
          name: 'Mantenimiento',
          description: 'Rutina de mantenimiento',
        }),
      ).resolves.toEqual(otherCompanyTaskType);

      expect(repository.findByNameAndCompanyId).toHaveBeenCalledWith(
        'Mantenimiento',
        'company-2',
      );
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
        useCase.execute('task-type-1', 'company-1', input as UpdateTaskTypeInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing task type', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('task-type-1', 'company-2', { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects missing task ids', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTaskType);
      taskReader.findByIdsForCompany.mockResolvedValue([{ id: 'task-1' }]);

      await expect(
        useCase.execute('task-type-1', 'company-1', {
          taskIds: ['task-1', 'task-2'],
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects duplicate task type name within the same company on update', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTaskType);
      repository.findByNameAndCompanyId.mockResolvedValue(otherCompanyTaskType);

      await expect(
        useCase.execute('task-type-1', 'company-1', {
          name: 'Nuevo nombre',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('updates a task type', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTaskType);
      repository.findByNameAndCompanyId.mockResolvedValue(null);
      taskReader.findByIdsForCompany.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
      repository.updateForCompany.mockResolvedValue({
        ...baseTaskType,
        name: 'Nuevo nombre',
      });

      await expect(
        useCase.execute('task-type-1', 'company-1', {
          name: 'Nuevo nombre',
          description: 'Actualizada',
          taskIds: ['task-1', 'task-2'],
        }),
      ).resolves.toEqual({
        ...baseTaskType,
        name: 'Nuevo nombre',
      });

      expect(repository.updateForCompany).toHaveBeenCalledWith('task-type-1', 'company-1', {
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
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('task-type-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.deleteForCompany).not.toHaveBeenCalled();
    });

    it('deletes a task type and returns legacy message', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseTaskType);

      await expect(useCase.execute('task-type-1', 'company-1')).resolves.toEqual({
        message: 'Task type with id task-type-1 deleted successfully',
      });
      expect(repository.deleteForCompany).toHaveBeenCalledWith('task-type-1', 'company-1');
    });
  });
});
