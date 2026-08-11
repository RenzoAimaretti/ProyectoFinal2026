import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { CompanyReaderPort, MachineRepositoryPort } from '../machine.ports';
import { CreateMachineInput, MachineStatusValue, UpdateMachineInput } from '../machine.types';
import { CreateMachineUseCase } from './create-machine.use-case';
import { FindAllMachinesUseCase } from './find-all-machines.use-case';
import { FindMachineUseCase } from './find-machine.use-case';
import { UpdateMachineUseCase } from './update-machine.use-case';

const baseMachine = {
  id: 'machine-1',
  companyId: 'company-1',
  name: 'Tractor',
  brand: 'John Deere',
  status: 'ACTIVA' as MachineStatusValue,
  entryDate: new Date('2026-01-10T00:00:00.000Z'),
  maintenanceDate: null,
  createdAt: new Date('2026-01-11T00:00:00.000Z'),
  updatedAt: new Date('2026-01-12T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<MachineRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const companyReader: jest.Mocked<CompanyReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, companyReader };
}

describe('Machine use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/machine');
    const files = [
      'domain/errors.ts',
      'application/machine.ports.ts',
      'application/machine.types.ts',
      'application/machine.validation.ts',
      'application/use-cases/create-machine.use-case.ts',
      'application/use-cases/find-all-machines.use-case.ts',
      'application/use-cases/find-machine.use-case.ts',
      'application/use-cases/update-machine.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllMachinesUseCase', () => {
    it('returns all machines', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseMachine]);

      const useCase = new FindAllMachinesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseMachine]);
    });

    it('returns an empty list when there are no machines', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllMachinesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindMachineUseCase', () => {
    it('returns a machine by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseMachine);

      const useCase = new FindMachineUseCase(repository);

      await expect(useCase.execute('machine-1')).resolves.toEqual(baseMachine);
    });

    it('returns null when the machine is missing', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindMachineUseCase(repository);

      await expect(useCase.execute('machine-1')).resolves.toBeNull();
    });
  });

  describe('CreateMachineUseCase', () => {
    let repository: jest.Mocked<MachineRepositoryPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let useCase: CreateMachineUseCase;

    beforeEach(() => {
      ({ repository, companyReader } = createPorts());
      useCase = new CreateMachineUseCase(repository, companyReader);
    });

    it.each([
      ['companyId', undefined],
      ['name', undefined],
      ['brand', undefined],
      ['entryDate', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateMachineInput = {
        companyId: 'company-1',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: '2026-01-10',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects invalid entry dates', async () => {
      await expect(
        useCase.execute({
          companyId: 'company-1',
          name: 'Tractor',
          brand: 'John Deere',
          entryDate: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing companies', async () => {
      companyReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          companyId: 'company-1',
          name: 'Tractor',
          brand: 'John Deere',
          entryDate: '2026-01-10',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('creates a machine', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      repository.create.mockResolvedValue(baseMachine);

      await expect(
        useCase.execute({
          companyId: 'company-1',
          name: 'Tractor',
          brand: 'John Deere',
          entryDate: '2026-01-10',
        }),
      ).resolves.toEqual(baseMachine);

      expect(repository.create).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: new Date('2026-01-10'),
      });
    });
  });

  describe('UpdateMachineUseCase', () => {
    let repository: jest.Mocked<MachineRepositoryPort>;
    let useCase: UpdateMachineUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateMachineUseCase(repository);
    });

    it('rejects missing machines', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('machine-1', { status: 'MANTENIMIENTO' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects invalid status and dates', async () => {
      repository.findById.mockResolvedValue(baseMachine);

      await expect(
        useCase.execute('machine-1', { status: 'NO_EXISTE' as MachineStatusValue }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      await expect(
        useCase.execute('machine-1', { entryDate: 'not-a-date' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates a machine', async () => {
      repository.findById.mockResolvedValue(baseMachine);
      repository.update.mockResolvedValue({
        ...baseMachine,
        status: 'MANTENIMIENTO',
      });

      await expect(
        useCase.execute('machine-1', {
          name: 'Tractor nuevo',
          brand: 'Caterpillar',
          entryDate: '2026-01-15',
          status: 'MANTENIMIENTO',
          maintenanceDate: '2026-01-16',
        }),
      ).resolves.toEqual({
        ...baseMachine,
        status: 'MANTENIMIENTO',
      });

      expect(repository.update).toHaveBeenCalledWith('machine-1', {
        name: 'Tractor nuevo',
        brand: 'Caterpillar',
        entryDate: new Date('2026-01-15'),
        status: 'MANTENIMIENTO',
        maintenanceDate: new Date('2026-01-16'),
      });
    });
  });
});
