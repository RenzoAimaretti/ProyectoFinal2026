import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { LivestockStatus } from '../../domain/livestock-status';
import { CreateLivestockInput, UpdateLivestockInput } from '../livestock.types';
import { CreateLivestockUseCase } from './create-livestock.use-case';
import { FindAllLivestockUseCase } from './find-all-livestock.use-case';
import { FindLivestockUseCase } from './find-livestock.use-case';
import { RemoveLivestockUseCase } from './remove-livestock.use-case';
import { UpdateLivestockUseCase } from './update-livestock.use-case';

const baseLivestock = {
  id: 'livestock-1',
  companyId: 'company-1',
  lotId: null,
  tagNumber: 'TAG-001',
  species: 'Bovine',
  breed: null,
  sex: 'M',
  birthDate: null,
  status: 'ACTIVO' as LivestockStatus,
  entryDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository = {
    findAll: jest.fn(),
    findAllByCompanyId: jest.fn(),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByTagNumber: jest.fn(),
    findByTagNumberAndCompanyId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateForCompany: jest.fn(),
    delete: jest.fn(),
    deleteForCompany: jest.fn(),
  };

  const companyReader = {
    findById: jest.fn(),
  };

  const lotReader = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  return { repository, companyReader, lotReader };
}

describe('Livestock use cases', () => {
  it('keeps application use-cases free of NestJS and Prisma imports', () => {
    const basePath = join(
      process.cwd(),
      'src/entities/livestock/application/use-cases',
    );
    const files = [
      'create-livestock.use-case.ts',
      'find-all-livestock.use-case.ts',
      'find-livestock.use-case.ts',
      'remove-livestock.use-case.ts',
      'update-livestock.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllLivestockUseCase', () => {
    it('returns only livestock for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseLivestock]);

      const useCase = new FindAllLivestockUseCase(repository as never);

      await expect((useCase as any).execute('company-1')).resolves.toEqual([baseLivestock]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for a different company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllLivestockUseCase(repository as never);

      await expect((useCase as any).execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindLivestockUseCase', () => {
    it('returns a livestock by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseLivestock);

      const useCase = new FindLivestockUseCase(repository as never);

      await expect((useCase as any).execute('livestock-1', 'company-1')).resolves.toEqual(
        baseLivestock,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
    });

    it('rejects a cross-tenant livestock target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindLivestockUseCase(repository as never);

      await expect((useCase as any).execute('livestock-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-2',
      );
    });
  });

  describe('CreateLivestockUseCase', () => {
    let repository: ReturnType<typeof createPorts>['repository'];
    let companyReader: ReturnType<typeof createPorts>['companyReader'];
    let lotReader: ReturnType<typeof createPorts>['lotReader'];
    let useCase: CreateLivestockUseCase;

    beforeEach(() => {
      ({ repository, companyReader, lotReader } = createPorts());
      useCase = new CreateLivestockUseCase(
        repository as never,
        companyReader as never,
        lotReader as never,
      );
    });

    it('ignores deprecated body companyId and creates under the JWT tenant', async () => {
      companyReader.findById.mockImplementation(async (companyId: string) =>
        companyId === 'company-1' ? { id: companyId } : null,
      );
      repository.findByTagNumberAndCompanyId.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...baseLivestock,
        id: 'livestock-2',
        companyId: 'company-1',
      });

      const result = await (useCase as any).execute('company-1', {
        companyId: 'company-2',
        tagNumber: 'TAG-002',
        species: 'Bovine',
        sex: 'M',
        lotId: null,
        breed: null,
        birthDate: null,
      } as CreateLivestockInput);

      expect(result).toEqual({
        ...baseLivestock,
        id: 'livestock-2',
        companyId: 'company-1',
      });
      expect(companyReader.findById).toHaveBeenCalledWith('company-1');
      expect(repository.create).toHaveBeenCalledWith({
        companyId: 'company-1',
        lotId: null,
        tagNumber: 'TAG-002',
        breed: null,
        species: 'Bovine',
        birthDate: undefined,
        sex: 'M',
      });
    });

    it('rejects duplicate tag numbers within the same company', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      repository.findByTagNumberAndCompanyId.mockResolvedValue({
        ...baseLivestock,
        id: 'livestock-dup',
      });

      await expect(
        (useCase as any).execute('company-1', {
          companyId: 'company-1',
          tagNumber: 'TAG-001',
          species: 'Bovine',
          sex: 'M',
          lotId: null,
          breed: null,
          birthDate: null,
        } as CreateLivestockInput),
      ).rejects.toBeInstanceOf(DuplicateEntityError);

      expect(repository.findByTagNumberAndCompanyId).toHaveBeenCalledWith(
        'TAG-001',
        'company-1',
      );
    });
  });

  describe('UpdateLivestockUseCase', () => {
    let repository: ReturnType<typeof createPorts>['repository'];
    let companyReader: ReturnType<typeof createPorts>['companyReader'];
    let lotReader: ReturnType<typeof createPorts>['lotReader'];
    let useCase: UpdateLivestockUseCase;

    beforeEach(() => {
      ({ repository, companyReader, lotReader } = createPorts());
      useCase = new UpdateLivestockUseCase(
        repository as never,
        companyReader as never,
        lotReader as never,
      );
    });

    it('rejects a cross-tenant livestock target', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        (useCase as any).execute('livestock-1', 'company-1', {
          tagNumber: 'TAG-002',
        } as UpdateLivestockInput),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
      expect(repository.updateForCompany).not.toHaveBeenCalled();
    });

    it('ignores deprecated body companyId and updates inside the JWT tenant', async () => {
      repository.findByIdForCompany.mockResolvedValue({ ...baseLivestock });
      repository.updateForCompany.mockResolvedValue({
        ...baseLivestock,
        tagNumber: 'TAG-002',
      });

      const result = await (useCase as any).execute('livestock-1', 'company-1', {
        companyId: 'company-2',
        tagNumber: 'TAG-002',
      } as UpdateLivestockInput);

      expect(result).toEqual({
        ...baseLivestock,
        tagNumber: 'TAG-002',
      });
      expect(companyReader.findById).not.toHaveBeenCalled();
      expect(repository.updateForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
        {
          tagNumber: 'TAG-002',
        },
      );
    });
  });

  describe('RemoveLivestockUseCase', () => {
    let repository: ReturnType<typeof createPorts>['repository'];
    let useCase: RemoveLivestockUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new RemoveLivestockUseCase(repository as never);
    });

    it('rejects a cross-tenant livestock target', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect((useCase as any).execute('livestock-1', 'company-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
      expect(repository.deleteForCompany).not.toHaveBeenCalled();
    });

    it('removes livestock within the current company scope', async () => {
      repository.findByIdForCompany.mockResolvedValue({ ...baseLivestock });

      await expect((useCase as any).execute('livestock-1', 'company-1')).resolves.toEqual({
        message: 'Livestock with id livestock-1 deleted successfully',
      });

      expect(repository.deleteForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
    });
  });
});
