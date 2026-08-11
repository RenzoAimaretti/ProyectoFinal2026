import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuplicateEntityError, InvalidInputError } from '../../domain/errors';
import { ModuleEntityRepositoryPort } from '../module-entity.ports';
import {
  CreateModuleEntityInput,
  UpdateModuleEntityInput,
} from '../module-entity.types';
import { CreateModuleEntityUseCase } from './create-module-entity.use-case';
import { FindAllModuleEntitiesUseCase } from './find-all-module-entities.use-case';
import { FindModuleEntityByNameUseCase } from './find-module-entity-by-name.use-case';
import { FindModuleEntityUseCase } from './find-module-entity.use-case';
import { UpdateModuleEntityUseCase } from './update-module-entity.use-case';

const baseModuleEntity = {
  id: 'module-1',
  name: 'Inventario',
  price: 1200,
  version: '1.0.0',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<ModuleEntityRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  return { repository };
}

describe('Module entity use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/module-entity');
    const files = [
      'domain/errors.ts',
      'application/module-entity.ports.ts',
      'application/module-entity.types.ts',
      'application/module-entity.validation.ts',
      'application/use-cases/create-module-entity.use-case.ts',
      'application/use-cases/find-all-module-entities.use-case.ts',
      'application/use-cases/find-module-entity-by-name.use-case.ts',
      'application/use-cases/find-module-entity.use-case.ts',
      'application/use-cases/update-module-entity.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateModuleEntityUseCase', () => {
    let useCase: CreateModuleEntityUseCase;
    let repository: jest.Mocked<ModuleEntityRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new CreateModuleEntityUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['price', 0],
      ['version', ''],
    ])('rejects invalid %s', async (field, value) => {
      const input: CreateModuleEntityInput = {
        name: 'Inventario',
        price: 1200,
        version: '1.0.0',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects duplicate name', async () => {
      repository.findByName.mockResolvedValue({ ...baseModuleEntity });

      await expect(
        useCase.execute({
          name: 'Inventario',
          price: 1200,
          version: '1.0.0',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates module entity', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseModuleEntity);

      await expect(
        useCase.execute({
          name: 'Inventario',
          price: 1200,
          version: '1.0.0',
        }),
      ).resolves.toEqual(baseModuleEntity);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Inventario',
        price: 1200,
        version: '1.0.0',
      });
    });
  });

  describe('UpdateModuleEntityUseCase', () => {
    let useCase: UpdateModuleEntityUseCase;
    let repository: jest.Mocked<ModuleEntityRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateModuleEntityUseCase(repository);
    });

    it.each([
      undefined,
      {},
      { name: '', price: 1200, version: '1.0.0' },
      { name: 'Inventario', price: 0, version: '1.0.0' },
    ])('rejects invalid update payload %p', async (input) => {
      await expect(
        useCase.execute('module-1', input as UpdateModuleEntityInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates module entity', async () => {
      repository.update.mockResolvedValue(baseModuleEntity);

      await expect(
        useCase.execute('module-1', {
          name: 'Inventario',
          price: 1500,
          version: '1.1.0',
        }),
      ).resolves.toEqual(baseModuleEntity);

      expect(repository.update).toHaveBeenCalledWith('module-1', {
        name: 'Inventario',
        price: 1500,
        version: '1.1.0',
      });
    });
  });

  describe('Read use cases', () => {
    it('returns all module entities', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseModuleEntity]);
      const useCase = new FindAllModuleEntitiesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseModuleEntity]);
    });

    it('returns a module entity by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseModuleEntity);
      const useCase = new FindModuleEntityUseCase(repository);

      await expect(useCase.execute('module-1')).resolves.toEqual(
        baseModuleEntity,
      );
    });

    it('returns a module entity by name', async () => {
      const { repository } = createPorts();
      repository.findByName.mockResolvedValue(baseModuleEntity);
      const useCase = new FindModuleEntityByNameUseCase(repository);

      await expect(useCase.execute('Inventario')).resolves.toEqual(
        baseModuleEntity,
      );
    });
  });
});
