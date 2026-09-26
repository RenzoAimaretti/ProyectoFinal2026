import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
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
  const repository = {
    findAll: jest.fn(),
    findAllByCompanyId: jest.fn(),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateForCompany: jest.fn(),
  };

  const companyReader = {
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
    it('returns only machines for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseMachine]);

      const useCase = new FindAllMachinesUseCase(repository as never);

      await expect((useCase as any).execute('company-1')).resolves.toEqual([baseMachine]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for another company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllMachinesUseCase(repository as never);

      await expect((useCase as any).execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindMachineUseCase', () => {
    it('returns a machine by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseMachine);

      const useCase = new FindMachineUseCase(repository as never);

      await expect((useCase as any).execute('machine-1', 'company-1')).resolves.toEqual(
        baseMachine,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('machine-1', 'company-1');
    });

    it('rejects a cross-tenant machine target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindMachineUseCase(repository as never);

      await expect((useCase as any).execute('machine-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('machine-1', 'company-2');
    });
  });

  describe('CreateMachineUseCase', () => {
    let repository: ReturnType<typeof createPorts>['repository'];
    let companyReader: ReturnType<typeof createPorts>['companyReader'];
    let useCase: CreateMachineUseCase;

    beforeEach(() => {
      ({ repository, companyReader } = createPorts());
      useCase = new CreateMachineUseCase(repository as never, companyReader as never);
    });

    it('ignores deprecated body companyId and creates under the JWT tenant', async () => {
      companyReader.findById.mockImplementation(async (companyId: string) =>
        companyId === 'company-1' ? { id: companyId } : null,
      );
      repository.create.mockResolvedValue({
        ...baseMachine,
        id: 'machine-2',
        companyId: 'company-1',
      });

      const result = await (useCase as any).execute('company-1', {
        companyId: 'company-2',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: '2026-01-10',
      } as CreateMachineInput);

      expect(result).toEqual({
        ...baseMachine,
        id: 'machine-2',
        companyId: 'company-1',
      });
      expect(companyReader.findById).toHaveBeenCalledWith('company-1');
      expect(repository.create).toHaveBeenCalledWith({
        companyId: 'company-1',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: new Date('2026-01-10'),
      });
    });

    it('rejects missing companies for the tenant-scoped create flow', async () => {
      companyReader.findById.mockResolvedValue(null);

      await expect(
        (useCase as any).execute('company-1', {
          companyId: 'company-2',
          name: 'Tractor',
          brand: 'John Deere',
          entryDate: '2026-01-10',
        } as CreateMachineInput),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });
  });

  describe('UpdateMachineUseCase', () => {
    let repository: ReturnType<typeof createPorts>['repository'];
    let useCase: UpdateMachineUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateMachineUseCase(repository as never);
    });

    it('rejects a cross-tenant machine target', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        (useCase as any).execute('machine-1', 'company-1', {
          status: 'MANTENIMIENTO',
        } as UpdateMachineInput),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('machine-1', 'company-1');
      expect(repository.updateForCompany).not.toHaveBeenCalled();
    });

    it('ignores deprecated body companyId and updates inside the JWT tenant', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseMachine);
      repository.updateForCompany.mockResolvedValue({
        ...baseMachine,
        status: 'MANTENIMIENTO',
      });

      const result = await (useCase as any).execute('machine-1', 'company-1', {
        companyId: 'company-2' as never,
        name: 'Tractor nuevo',
        brand: 'Caterpillar',
        entryDate: '2026-01-15',
        status: 'MANTENIMIENTO',
        maintenanceDate: '2026-01-16',
      } as UpdateMachineInput);

      expect(result).toEqual({
        ...baseMachine,
        status: 'MANTENIMIENTO',
      });
      expect(repository.updateForCompany).toHaveBeenCalledWith('machine-1', 'company-1', {
        name: 'Tractor nuevo',
        brand: 'Caterpillar',
        entryDate: new Date('2026-01-15'),
        status: 'MANTENIMIENTO',
        maintenanceDate: new Date('2026-01-16'),
      });
    });
  });
});
