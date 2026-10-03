import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import { CreateMachineUsageInput, MachineStatusValue, UpdateMachineUsageInput } from '../machine-usage.types';
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
  return {
    repository: {
      findAllByCompanyId: jest.fn(),
      findByIdForCompany: jest.fn(),
      create: jest.fn(),
      updateForCompany: jest.fn(),
    },
    machineReader: {
      findById: jest.fn(),
      findByIdForCompany: jest.fn(),
    },
    taskReader: {
      findByIdWithOperators: jest.fn(),
      findByIdWithOperatorsForCompany: jest.fn(),
    },
    userReader: {
      findById: jest.fn(),
      findByIdForCompany: jest.fn(),
    },
  };
}

describe('Machine usage use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/machine-usage');
    const files = [
      'domain/errors.ts',
      'application/machine-usage.ports.ts',
      'application/machine-usage.types.ts',
      'application/machine-usage.validation.ts',
      'application/use-cases/create-machine-usage.use-case.ts',
      'application/use-cases/find-all-machine-usages.use-case.ts',
      'application/use-cases/find-machine-usage.use-case.ts',
      'application/use-cases/update-machine-usage.use-case.ts',
    ];

    const contents = files.map((file) => readFileSync(join(basePath, file), 'utf8')).join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllMachineUsagesUseCase', () => {
    it('returns only machine usages for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseMachineUsage]);

      const useCase = new FindAllMachineUsagesUseCase(repository as never);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseMachineUsage]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for another company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllMachineUsagesUseCase(repository as never);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);
      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindMachineUsageUseCase', () => {
    it('returns a machine usage by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseMachineUsage);

      const useCase = new FindMachineUsageUseCase(repository as never);

      await expect(useCase.execute('usage-1', 'company-1')).resolves.toEqual(baseMachineUsage);
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('usage-1', 'company-1');
    });

    it('rejects a cross-tenant machine usage target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindMachineUsageUseCase(repository as never);

      await expect(useCase.execute('usage-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('usage-1', 'company-2');
    });
  });

  describe('CreateMachineUsageUseCase', () => {
    let repository: any;
    let machineReader: any;
    let taskReader: any;
    let userReader: any;
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

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects a machine that belongs to another company', async () => {
      machineReader.findByIdForCompany.mockResolvedValue(null);
      machineReader.findById.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' as MachineStatusValue });
      taskReader.findByIdWithOperatorsForCompany.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      taskReader.findByIdWithOperators.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });

      await expect(
        useCase.execute('company-1', {
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(machineReader.findByIdForCompany).toHaveBeenCalledWith('machine-1', 'company-1');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a task that belongs to another company', async () => {
      machineReader.findByIdForCompany.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' });
      machineReader.findById.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' });
      taskReader.findByIdWithOperatorsForCompany.mockResolvedValue(null);
      taskReader.findByIdWithOperators.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });

      await expect(
        useCase.execute('company-1', {
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(taskReader.findByIdWithOperatorsForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a machine usage inside the current company scope', async () => {
      machineReader.findByIdForCompany.mockResolvedValue({ id: 'machine-1', status: 'ACTIVA' });
      taskReader.findByIdWithOperatorsForCompany.mockResolvedValue({
        id: 'task-1',
        operators: [{ id: 'user-1' }],
      });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseMachineUsage);

      await expect(
        useCase.execute('company-1', {
          machineId: 'machine-1',
          taskId: 'task-1',
          operatorId: 'user-1',
          intialFuel: 12,
        }),
      ).resolves.toEqual(baseMachineUsage);

      expect(machineReader.findByIdForCompany).toHaveBeenCalledWith('machine-1', 'company-1');
      expect(taskReader.findByIdWithOperatorsForCompany).toHaveBeenCalledWith(
        'task-1',
        'company-1',
      );
      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.create).toHaveBeenCalledWith({
        machineId: 'machine-1',
        taskId: 'task-1',
        initialFuel: 12,
      });
    });
  });

  describe('UpdateMachineUsageUseCase', () => {
    let repository: any;
    let useCase: UpdateMachineUsageUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateMachineUsageUseCase(repository as never);
    });

    it('rejects a missing machine usage in the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('usage-1', 'company-2', { initialFuel: 10 })).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.findByIdForCompany).toHaveBeenCalledWith('usage-1', 'company-2');
    });

    it('updates a machine usage inside the current company scope', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseMachineUsage);
      repository.updateForCompany.mockResolvedValue({
        ...baseMachineUsage,
        finalFuel: 8,
      });

      await expect(
        useCase.execute('usage-1', 'company-1', {
          initialFuel: 11,
          finalFuel: 8,
          usageHours: 2.5,
          observations: 'updated',
        }),
      ).resolves.toEqual({
        ...baseMachineUsage,
        finalFuel: 8,
      });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('usage-1', 'company-1');
      expect(repository.updateForCompany).toHaveBeenCalledWith('usage-1', 'company-1', {
        initialFuel: 11,
        finalFuel: 8,
        usageHours: 2.5,
        observations: 'updated',
      });
    });
  });
});
