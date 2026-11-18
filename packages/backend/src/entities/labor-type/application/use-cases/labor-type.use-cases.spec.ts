import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { TaskReaderPort, LaborTypeRepositoryPort } from '../labor-type.ports';
import { CreateLaborTypeInput, LaborTypeRecord, UpdateLaborTypeInput } from '../labor-type.types';
import { CreateLaborTypeUseCase } from './create-labor-type.use-case';
import { DeleteLaborTypeUseCase } from './delete-labor-type.use-case';
import { FindAllLaborTypesUseCase } from './find-all-labor-types.use-case';
import { FindLaborTypeUseCase } from './find-labor-type.use-case';
import { UpdateLaborTypeUseCase } from './update-labor-type.use-case';

const baseLaborType: LaborTypeRecord = {
  id: 'labor-type-1',
  tenantId: 'company-1',
  name: 'Mantenimiento',
  description: 'Rutina de mantenimiento',
  kind: 'OTRO',
};

const otherTenantLaborType = {
  ...baseLaborType,
  tenantId: 'company-2',
  id: 'labor-type-2',
};

function createPorts() {
  const repository: jest.Mocked<LaborTypeRepositoryPort> = {
    findAllByTenantId: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByNameAndTenantId: jest.fn(),
    findByIdsForTenant: jest.fn(),
    create: jest.fn(),
    updateForTenant: jest.fn(),
    deleteForTenant: jest.fn(),
  };

  const taskReader: jest.Mocked<TaskReaderPort> = {
    findByIdsForTenant: jest.fn(),
  };

  return { repository, taskReader };
}

describe('Labor type use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/labor-type');
    const files = [
      'domain/errors.ts',
      'domain/labor-kind.ts',
      'application/labor-type.ports.ts',
      'application/labor-type.types.ts',
      'application/labor-type.validation.ts',
      'application/use-cases/create-labor-type.use-case.ts',
      'application/use-cases/delete-labor-type.use-case.ts',
      'application/use-cases/find-all-labor-types.use-case.ts',
      'application/use-cases/find-labor-type.use-case.ts',
      'application/use-cases/update-labor-type.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllLaborTypesUseCase', () => {
    it('returns all labor types', async () => {
      const { repository } = createPorts();
      repository.findAllByTenantId.mockResolvedValue([baseLaborType]);

      const useCase = new FindAllLaborTypesUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseLaborType]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when there are no labor types', async () => {
      const { repository } = createPorts();
      repository.findAllByTenantId.mockResolvedValue([]);

      const useCase = new FindAllLaborTypesUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindLaborTypeUseCase', () => {
    it('returns a labor type by id', async () => {
      const { repository } = createPorts();
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);

      const useCase = new FindLaborTypeUseCase(repository);

      await expect(useCase.execute('labor-type-1', 'company-1')).resolves.toEqual(
        baseLaborType,
      );
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'labor-type-1',
        'company-1',
      );
    });

    it('rejects missing labor type outside the company', async () => {
      const { repository } = createPorts();
      repository.findByIdForTenant.mockResolvedValue(null);

      const useCase = new FindLaborTypeUseCase(repository);

      await expect(useCase.execute('labor-type-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'labor-type-1',
        'company-2',
      );
    });
  });

  describe('CreateLaborTypeUseCase', () => {
    let repository: jest.Mocked<LaborTypeRepositoryPort>;
    let useCase: CreateLaborTypeUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new CreateLaborTypeUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['name', ''],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateLaborTypeInput = { name: 'Mantenimiento' };
      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects duplicate labor type names', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(baseLaborType);

      await expect(
        useCase.execute('company-1', { name: 'Mantenimiento' }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Mantenimiento',
        'company-1',
      );
    });

    it('creates a labor type', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseLaborType);

      await expect(
        useCase.execute('company-1', {
          name: 'Mantenimiento',
          description: 'Rutina de mantenimiento',
        }),
      ).resolves.toEqual(baseLaborType);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Mantenimiento',
        description: 'Rutina de mantenimiento',
        tenantId: 'company-1',
        kind: 'OTRO',
      });
    });

    it('allows the same labor type name in another company', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(otherTenantLaborType);

      await expect(
        useCase.execute('company-2', {
          name: 'Mantenimiento',
          description: 'Rutina de mantenimiento',
        }),
      ).resolves.toEqual(otherTenantLaborType);

      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Mantenimiento',
        'company-2',
      );
    });
  });

  describe('UpdateLaborTypeUseCase', () => {
    let repository: jest.Mocked<LaborTypeRepositoryPort>;
    let taskReader: jest.Mocked<TaskReaderPort>;
    let useCase: UpdateLaborTypeUseCase;

    beforeEach(() => {
      ({ repository, taskReader } = createPorts());
      useCase = new UpdateLaborTypeUseCase(repository, taskReader);
    });

    it.each([undefined, {}])('rejects empty update payload %p', async (input) => {
      await expect(
        useCase.execute('labor-type-1', 'company-1', input as UpdateLaborTypeInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing labor type', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('labor-type-1', 'company-2', { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects missing task ids', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);
      taskReader.findByIdsForTenant.mockResolvedValue([{ id: 'task-1' }]);

      await expect(
        useCase.execute('labor-type-1', 'company-1', {
          taskIds: ['task-1', 'task-2'],
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects duplicate labor type name within the same company on update', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);
      repository.findByNameAndTenantId.mockResolvedValue(otherTenantLaborType);

      await expect(
        useCase.execute('labor-type-1', 'company-1', {
          name: 'Nuevo nombre',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('updates a labor type', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);
      repository.findByNameAndTenantId.mockResolvedValue(null);
      taskReader.findByIdsForTenant.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
      repository.updateForTenant.mockResolvedValue({
        ...baseLaborType,
        name: 'Nuevo nombre',
      });

      await expect(
        useCase.execute('labor-type-1', 'company-1', {
          name: 'Nuevo nombre',
          description: 'Actualizada',
          taskIds: ['task-1', 'task-2'],
        }),
      ).resolves.toEqual({
        ...baseLaborType,
        name: 'Nuevo nombre',
      });

      expect(repository.updateForTenant).toHaveBeenCalledWith('labor-type-1', 'company-1', {
        name: 'Nuevo nombre',
        description: 'Actualizada',
        taskIds: ['task-1', 'task-2'],
      });
    });
  });

  describe('DeleteLaborTypeUseCase', () => {
    let repository: jest.Mocked<LaborTypeRepositoryPort>;
    let useCase: DeleteLaborTypeUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new DeleteLaborTypeUseCase(repository);
    });

    it('rejects a missing labor type', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(useCase.execute('labor-type-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.deleteForTenant).not.toHaveBeenCalled();
    });

    it('deletes a labor type and returns legacy message', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);

      await expect(useCase.execute('labor-type-1', 'company-1')).resolves.toEqual({
        message: 'Labor type with id labor-type-1 deleted successfully',
      });
      expect(repository.deleteForTenant).toHaveBeenCalledWith('labor-type-1', 'company-1');
    });
  });

  describe('Labor kind contract', () => {
    let repository: jest.Mocked<LaborTypeRepositoryPort>;
    let taskReader: jest.Mocked<TaskReaderPort>;
    let createUseCase: CreateLaborTypeUseCase;
    let updateUseCase: UpdateLaborTypeUseCase;

    beforeEach(() => {
      ({ repository, taskReader } = createPorts());
      createUseCase = new CreateLaborTypeUseCase(repository);
      updateUseCase = new UpdateLaborTypeUseCase(repository, taskReader);
    });

    it('creates a labor type with the kind the admin chose', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue({ ...baseLaborType, kind: 'SIEMBRA' });

      await expect(
        createUseCase.execute('company-1', {
          name: 'Siembra gruesa',
          kind: 'SIEMBRA',
        }),
      ).resolves.toEqual({ ...baseLaborType, kind: 'SIEMBRA' });

      expect(repository.create).toHaveBeenCalledWith({
        tenantId: 'company-1',
        name: 'Siembra gruesa',
        description: undefined,
        kind: 'SIEMBRA',
      });
    });

    it('falls back to OTRO when the admin does not classify the labor type', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseLaborType);

      await createUseCase.execute('company-1', { name: 'Mantenimiento' });

      expect(repository.create).toHaveBeenCalledWith({
        tenantId: 'company-1',
        name: 'Mantenimiento',
        description: undefined,
        kind: 'OTRO',
      });
    });

    it('rejects an unknown kind on create with the exact message and writes nothing', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);

      const error = await createUseCase
        .execute('company-1', { name: 'Labranza', kind: 'LABRANZA' })
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(InvalidInputError);
      expect((error as Error).message).toBe(
        'kind must be one of SIEMBRA, PULVERIZACION, FERTILIZACION, COSECHA, OTRO',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('reclassifies an existing labor type', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);
      repository.updateForTenant.mockResolvedValue({
        ...baseLaborType,
        kind: 'COSECHA',
      });

      await expect(
        updateUseCase.execute('labor-type-1', 'company-1', { kind: 'COSECHA' }),
      ).resolves.toEqual({ ...baseLaborType, kind: 'COSECHA' });

      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'labor-type-1',
        'company-1',
        { kind: 'COSECHA' },
      );
    });

    it('rejects an unknown kind on update with the exact message and writes nothing', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);

      const error = await updateUseCase
        .execute('labor-type-1', 'company-1', { kind: 'LABRANZA' })
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(InvalidInputError);
      expect((error as Error).message).toBe(
        'kind must be one of SIEMBRA, PULVERIZACION, FERTILIZACION, COSECHA, OTRO',
      );
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('leaves the kind alone when the update omits it', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseLaborType);
      repository.updateForTenant.mockResolvedValue({
        ...baseLaborType,
        name: 'Otro nombre',
      });

      await updateUseCase.execute('labor-type-1', 'company-1', {
        name: 'Otro nombre',
      });

      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'labor-type-1',
        'company-1',
        { name: 'Otro nombre' },
      );
    });
  });
});
