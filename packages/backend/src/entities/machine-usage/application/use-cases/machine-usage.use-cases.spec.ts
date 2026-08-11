import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import {
  MachineReaderPort,
  MachineUsageRepositoryPort,
  TaskReaderPort,
  UserReaderPort,
} from '../machine-usage.ports';
import { CreateMachineUsageInput, UpdateMachineUsageInput } from '../machine-usage.types';
import { CreateMachineUsageUseCase } from './create-machine-usage.use-case';
import { FindAllMachineUsagesUseCase } from './find-all-machine-usages.use-case';
import { FindMachineUsageUseCase } from './find-machine-usage.use-case';
import { UpdateMachineUsageUseCase } from './update-machine-usage.use-case';

const baseMachineUsage = {
  id: 'usage-1',
  taskId: 'task-1',
  machineId: 'machine-1',
  initialFuel: 12,
  finalFuel: 10,
  usageHours: 2,
  observations: 'ok',
  createdAt: new Date('2026-01-11T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<MachineUsageRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const machineReader: jest.Mocked<MachineReaderPort> = {
    findById: jest.fn(),
  };

  const taskReader: jest.Mocked<TaskReaderPort> = {
    findByIdWithOperators: jest.fn(),
  };

  const userReader: jest.Mocked<UserReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, machineReader, taskReader, userReader };
}

describe('Machine usage use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/machine-usage');
    const files = [
      'domain/errors.ts',
      'application/machine-usage.ports.ts',
      'application/machine-usage.types.ts',
      'application/use-cases/create-machine-usage.use-case.ts',
      'application/use-cases/find-all-machine-usages.use-case.ts',
      'application/use-cases/find-machine-usage.use-case.ts',
      'application/use-cases/update-machine-usage.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllMachineUsagesUseCase', () => {
    it('returns all machine usages', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseMachineUsage]);

      const useCase = new FindAllMachineUsagesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseMachineUsage]);
    });

    it('returns an empty list when there are no machine usages', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllMachineUsagesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindMachineUsageUseCase', () => {
    it('returns a machine usage by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseMachineUsage);

      const useCase = new FindMachineUsageUseCase(repository);

      await expect(useCase.execute('usage-1')).resolves.toEqual(baseMachineUsage);
    });

    it('returns null when the machine usage is missing', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindMachineUsageUseCase(repository);

      await expect(useCase.execute('usage-1')).resolves.toBeNull();
    });
  });

  describe('CreateMachineUsageUseCase', () => {
    let repository: jest.Mocked<MachineUsageRepositoryPort>;
    let machineReader: jest.Mocked<MachineReaderPort>;
    let taskReader: jest.Mocked<TaskReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: CreateMachineUsageUseCase;

    beforeEach(() => {
      ({ repository, machineReader, taskReader, userReader } = createPorts());
      useCase = new CreateMachineUsageUseCase(repository, machineReader, taskReader, userReader);
    });

    it.each([
      ['machineId', undefined],
      ['taskId', undefined],
      ['operatorId', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateMachineUsageInput = {
        machineId: 'machine-1',
        taskId: 'task-1',
        operatorId: 'user-1',
        intialFuel: 12,
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing machine, task, or operator', async () => {
      machineReader.findById.mockResolvedValue(null);
      taskReader.findByIdWithOperators.mockResolvedValue(null);
      userReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects operators not assigned to the task', async () => {
      machineReader.findById.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' });
      taskReader.findByIdWithOperators.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-2' }],
      });
      userReader.findById.mockResolvedValue({ id: 'user-1' });

      await expect(
        useCase.execute({
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);
    });

    it('rejects machines that are not active', async () => {
      machineReader.findById.mockResolvedValue({ id: 'machine-1', status: 'MANTENIMIENTO' });
      taskReader.findByIdWithOperators.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      userReader.findById.mockResolvedValue({ id: 'user-1' });

      await expect(
        useCase.execute({
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('creates a machine usage', async () => {
      machineReader.findById.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' });
      taskReader.findByIdWithOperators.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseMachineUsage);

      await expect(
        useCase.execute({
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).resolves.toEqual(baseMachineUsage);

      expect(repository.create).toHaveBeenCalledWith({
        machineId: 'machine-1',
        taskId: 'task-1',
        initialFuel: 12,
      });
    });
  });

  describe('UpdateMachineUsageUseCase', () => {
    let repository: jest.Mocked<MachineUsageRepositoryPort>;
    let useCase: UpdateMachineUsageUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateMachineUsageUseCase(repository);
    });

    it('rejects missing machine usages', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('usage-1', { initialFuel: 10 }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('updates a machine usage', async () => {
      repository.findById.mockResolvedValue(baseMachineUsage);
      repository.update.mockResolvedValue({
        ...baseMachineUsage,
        finalFuel: 8,
      });

      await expect(
        useCase.execute('usage-1', {
          initialFuel: 11,
          finalFuel: 8,
          usageHours: 2.5,
          observations: 'updated',
        }),
      ).resolves.toEqual({
        ...baseMachineUsage,
        finalFuel: 8,
      });

      expect(repository.update).toHaveBeenCalledWith('usage-1', {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        observations: 'updated',
      });
    });
  });
});
