import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { InputUnit } from '../../domain/input-unit';
import { InputRepositoryPort, InputStockReaderPort } from '../input.ports';
import { CreateInputInput, InputRecord, UpdateInputInput } from '../input.types';
import { CreateInputUseCase } from './create-input.use-case';
import { FindAllInputsUseCase } from './find-all-inputs.use-case';
import { FindInputUseCase } from './find-input.use-case';
import { UpdateInputUseCase } from './update-input.use-case';

const baseInput: InputRecord = {
  id: 'input-1',
  tenantId: 'tenant-1',
  name: 'Glifosato',
  unit: 'L',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const otherTenantInput = {
  ...baseInput,
  id: 'input-2',
  tenantId: 'tenant-2',
};

function createRepository(): jest.Mocked<InputRepositoryPort> {
  return {
    findAllByTenantId: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByNameAndTenantId: jest.fn(),
    create: jest.fn(),
    updateForTenant: jest.fn(),
  };
}

describe('Input use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/input');
    const files = [
      'domain/errors.ts',
      'application/input.ports.ts',
      'application/input.types.ts',
      'application/input.validation.ts',
      'application/use-cases/create-input.use-case.ts',
      'application/use-cases/find-all-inputs.use-case.ts',
      'application/use-cases/find-input.use-case.ts',
      'application/use-cases/update-input.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllInputsUseCase', () => {
    it('returns only inputs for the provided tenant', async () => {
      const repository = createRepository();
      repository.findAllByTenantId.mockResolvedValue([baseInput]);

      const useCase = new FindAllInputsUseCase(repository);

      await expect(useCase.execute('tenant-1')).resolves.toEqual([baseInput]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-1');
    });

    it('returns an empty list when the tenant has no inputs', async () => {
      const repository = createRepository();
      repository.findAllByTenantId.mockResolvedValue([]);

      const useCase = new FindAllInputsUseCase(repository);

      await expect(useCase.execute('tenant-2')).resolves.toEqual([]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-2');
    });
  });

  describe('FindInputUseCase', () => {
    it('returns an input by id within the current tenant', async () => {
      const repository = createRepository();
      repository.findByIdForTenant.mockResolvedValue(baseInput);

      const useCase = new FindInputUseCase(repository);

      await expect(useCase.execute('input-1', 'tenant-1')).resolves.toEqual(
        baseInput,
      );
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'input-1',
        'tenant-1',
      );
    });

    it('rejects an input outside the current tenant', async () => {
      const repository = createRepository();
      repository.findByIdForTenant.mockResolvedValue(null);

      const useCase = new FindInputUseCase(repository);

      await expect(
        useCase.execute('input-1', 'tenant-2'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'input-1',
        'tenant-2',
      );
    });
  });

  describe('CreateInputUseCase', () => {
    let repository: jest.Mocked<InputRepositoryPort>;
    let useCase: CreateInputUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new CreateInputUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['name', ''],
      ['unit', ''],
    ])('rejects invalid required %s', async (field, value) => {
      const input: CreateInputInput = { name: 'Glifosato', unit: 'L' };
      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('tenant-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects a duplicate input name within the tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(baseInput);

      await expect(
        useCase.execute('tenant-1', { name: 'Glifosato', unit: 'L' }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Glifosato',
        'tenant-1',
      );
    });

    it('creates an input with the authenticated tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseInput);

      await expect(
        useCase.execute('tenant-1', { name: 'Glifosato', unit: 'L' }),
      ).resolves.toEqual(baseInput);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Glifosato',
        unit: 'L',
        tenantId: 'tenant-1',
      });
      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Glifosato',
        'tenant-1',
      );
    });

    it('allows the same input name in another tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(otherTenantInput);

      await expect(
        useCase.execute('tenant-2', { name: 'Glifosato', unit: 'L' }),
      ).resolves.toEqual(otherTenantInput);

      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Glifosato',
        'tenant-2',
      );
    });
  });

  describe('UpdateInputUseCase', () => {
    let repository: jest.Mocked<InputRepositoryPort>;
    let stockReader: jest.Mocked<InputStockReaderPort>;
    let useCase: UpdateInputUseCase;

    beforeEach(() => {
      repository = createRepository();
      stockReader = { hasNonZeroBalance: jest.fn() };
      useCase = new UpdateInputUseCase(repository, stockReader);
    });

    it.each([undefined, {}])(
      'rejects empty update payload %p',
      async (input) => {
        await expect(
          useCase.execute('input-1', 'tenant-1', input as UpdateInputInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects an input outside the current tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('input-1', 'tenant-2', { name: 'New name' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('rejects invalid field values', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);

      await expect(
        useCase.execute('input-1', 'tenant-1', { unit: '' as unknown as InputUnit }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('rejects a unit outside the locked vocabulary', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);

      await expect(
        useCase.execute('input-1', 'tenant-1', {
          unit: 'POUND' as unknown as InputUnit,
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
      expect(stockReader.hasNonZeroBalance).not.toHaveBeenCalled();
    });

    it('updates an input within the tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);
      repository.updateForTenant.mockResolvedValue({
        ...baseInput,
        name: 'Atrazina',
        active: false,
      });

      await expect(
        useCase.execute('input-1', 'tenant-1', {
          name: 'Atrazina',
          active: false,
        }),
      ).resolves.toEqual({ ...baseInput, name: 'Atrazina', active: false });

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'input-1',
        'tenant-1',
      );
      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'input-1',
        'tenant-1',
        { name: 'Atrazina', active: false },
      );
    });

    it('refuses a unit change when the input has a non-zero stock balance', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);
      stockReader.hasNonZeroBalance.mockResolvedValue(true);

      await expect(
        useCase.execute('input-1', 'tenant-1', { unit: 'KG' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('allows a unit change when every balance is zero', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);
      stockReader.hasNonZeroBalance.mockResolvedValue(false);
      repository.updateForTenant.mockResolvedValue({ ...baseInput, unit: 'KG' });

      await expect(
        useCase.execute('input-1', 'tenant-1', { unit: 'KG' }),
      ).resolves.toEqual({ ...baseInput, unit: 'KG' });

      expect(stockReader.hasNonZeroBalance).toHaveBeenCalledWith('input-1');
      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'input-1',
        'tenant-1',
        { unit: 'KG' },
      );
    });

    it('does not check stock when the incoming unit is unchanged', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseInput);
      repository.updateForTenant.mockResolvedValue(baseInput);

      await useCase.execute('input-1', 'tenant-1', {
        name: 'Atrazina',
        unit: 'L',
      });

      expect(stockReader.hasNonZeroBalance).not.toHaveBeenCalled();
    });
  });
});
