import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { CompanyRepositoryPort, ModuleReaderPort } from '../company.ports';
import { CreateCompanyInput, UpdateCompanyInput } from '../company.types';
import { AddCompanyModuleUseCase } from './add-company-module.use-case';
import { CreateCompanyUseCase } from './create-company.use-case';
import { FindAllCompaniesUseCase } from './find-all-companies.use-case';
import { FindCompanyByCuitUseCase } from './find-company-by-cuit.use-case';
import { FindCompanyUseCase } from './find-company.use-case';
import { UpdateCompanyUseCase } from './update-company.use-case';

const baseCompany = {
  id: 'company-1',
  name: 'Agrolify SA',
  cuit: '30-12345678-9',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseModule = {
  id: 'module-1',
  name: 'Inventario',
  price: 1200,
  version: '1.0.0',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<CompanyRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCuit: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addModule: jest.fn(),
  };

  const moduleReader: jest.Mocked<ModuleReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, moduleReader };
}

describe('Company use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/company');
    const files = [
      'domain/errors.ts',
      'application/company.ports.ts',
      'application/company.types.ts',
      'application/company.validation.ts',
      'application/use-cases/add-company-module.use-case.ts',
      'application/use-cases/create-company.use-case.ts',
      'application/use-cases/find-all-companies.use-case.ts',
      'application/use-cases/find-company-by-cuit.use-case.ts',
      'application/use-cases/find-company.use-case.ts',
      'application/use-cases/update-company.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateCompanyUseCase', () => {
    let useCase: CreateCompanyUseCase;
    let repository: jest.Mocked<CompanyRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new CreateCompanyUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['cuit', ''],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateCompanyInput = {
        name: 'Agrolify SA',
        cuit: '30-12345678-9',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects duplicate CUIT', async () => {
      repository.findByCuit.mockResolvedValue({ ...baseCompany, modules: [] });

      await expect(
        useCase.execute({
          name: 'Agrolify SA',
          cuit: '30-12345678-9',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates company', async () => {
      repository.findByCuit.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseCompany);

      await expect(
        useCase.execute({
          name: 'Agrolify SA',
          cuit: '30-12345678-9',
        }),
      ).resolves.toEqual(baseCompany);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Agrolify SA',
        cuit: '30-12345678-9',
      });
    });
  });

  describe('UpdateCompanyUseCase', () => {
    let useCase: UpdateCompanyUseCase;
    let repository: jest.Mocked<CompanyRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateCompanyUseCase(repository);
    });

    it.each([undefined, {}, { name: '   ' }])(
      'rejects empty update payload %p',
      async (input) => {
        await expect(
          useCase.execute('company-1', input as UpdateCompanyInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects missing company', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', {
          name: 'New name',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });
  });

  describe('AddCompanyModuleUseCase', () => {
    let useCase: AddCompanyModuleUseCase;
    let repository: jest.Mocked<CompanyRepositoryPort>;
    let moduleReader: jest.Mocked<ModuleReaderPort>;

    beforeEach(() => {
      ({ repository, moduleReader } = createPorts());
      useCase = new AddCompanyModuleUseCase(repository, moduleReader);
    });

    it.each([
      ['missing company', null, baseModule],
      ['missing module', { ...baseCompany, modules: [] }, null],
    ])('rejects %s', async (_label, company, module) => {
      repository.findById.mockResolvedValue(company);
      moduleReader.findById.mockResolvedValue(module);

      await expect(
        useCase.execute('company-1', 'module-1'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects already-added module', async () => {
      repository.findById.mockResolvedValue({
        ...baseCompany,
        modules: [{ ...baseModule }],
      });
      moduleReader.findById.mockResolvedValue(baseModule);

      await expect(
        useCase.execute('company-1', 'module-1'),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });
  });

  describe('Read use cases', () => {
    it('returns all companies', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseCompany]);
      const useCase = new FindAllCompaniesUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseCompany]);
    });

    it('returns a company by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue({
        ...baseCompany,
        modules: [{ ...baseModule }],
      });
      const useCase = new FindCompanyUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual({
        ...baseCompany,
        modules: [{ ...baseModule }],
      });
    });

    it('returns a company by cuit', async () => {
      const { repository } = createPorts();
      repository.findByCuit.mockResolvedValue({
        ...baseCompany,
        modules: [{ ...baseModule }],
      });
      const useCase = new FindCompanyByCuitUseCase(repository);

      await expect(useCase.execute('30-12345678-9')).resolves.toEqual({
        ...baseCompany,
        modules: [{ ...baseModule }],
      });
    });
  });
});
