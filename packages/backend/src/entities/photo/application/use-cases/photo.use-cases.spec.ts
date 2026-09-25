import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { PhotoRepositoryPort } from '../photo.ports';
import { AttachPhotoInput, PhotoRecord } from '../photo.types';
import { AttachPhotoUseCase } from './attach-photo.use-case';
import { ListEntityPhotosUseCase } from './list-entity-photos.use-case';
import { RemovePhotoUseCase } from './remove-photo.use-case';

const baseRecord: PhotoRecord = {
  id: 'photo-1',
  entityType: 'PARTE_DIARIO',
  entityId: 'report-1',
  localPath: '/docs/photo-1.jpg',
  orderIndex: 0,
  createdAt: new Date('2026-09-25T10:00:00.000Z'),
};

function createRepository(): jest.Mocked<PhotoRepositoryPort> {
  return {
    countByEntity: jest.fn(),
    findByEntity: jest.fn(),
    create: jest.fn(),
    deleteFromEntity: jest.fn(),
  };
}

describe('Photo use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/photo');
    const files = [
      'domain/errors.ts',
      'domain/photo-entity-type.ts',
      'domain/photo.rules.ts',
      'application/photo.ports.ts',
      'application/photo.types.ts',
      'application/use-cases/attach-photo.use-case.ts',
      'application/use-cases/list-entity-photos.use-case.ts',
      'application/use-cases/remove-photo.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('AttachPhotoUseCase', () => {
    let repository: jest.Mocked<PhotoRepositoryPort>;
    let useCase: AttachPhotoUseCase;

    beforeEach(() => {
      repository = createRepository();
      repository.countByEntity.mockResolvedValue(0);
      repository.create.mockResolvedValue(baseRecord);
      useCase = new AttachPhotoUseCase(repository);
    });

    const input: AttachPhotoInput = { localPath: '/docs/photo-1.jpg' };

    it('attaches a photo to the album of the referenced entity', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1', input),
      ).resolves.toEqual(baseRecord);

      expect(repository.countByEntity).toHaveBeenCalledWith(
        'PARTE_DIARIO',
        'report-1',
      );
      expect(repository.create).toHaveBeenCalledWith({
        entityType: 'PARTE_DIARIO',
        entityId: 'report-1',
        localPath: '/docs/photo-1.jpg',
        orderIndex: 0,
      });
    });

    it('normalizes the album key and the local path', async () => {
      await useCase.execute('RECEPCION', '  reception-1  ', {
        localPath: '  /docs/photo-2.jpg  ',
        orderIndex: 2,
      });

      expect(repository.countByEntity).toHaveBeenCalledWith(
        'RECEPCION',
        'reception-1',
      );
      expect(repository.create).toHaveBeenCalledWith({
        entityType: 'RECEPCION',
        entityId: 'reception-1',
        localPath: '/docs/photo-2.jpg',
        orderIndex: 2,
      });
    });

    it.each([0, 1, 4])('accepts an album with %i photos', async (current) => {
      repository.countByEntity.mockResolvedValue(current);

      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1', input),
      ).resolves.toEqual(baseRecord);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('rejects the sixth photo without persisting it', async () => {
      repository.countByEntity.mockResolvedValue(5);

      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1', input),
      ).rejects.toThrow('PARTE_DIARIO report-1');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an entity type the schema does not support', async () => {
      await expect(
        useCase.execute('DAILY_REPORT', 'report-1', input),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.countByEntity).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a missing local path', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1', { localPath: '   ' }),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a missing entity id', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', '  ', input),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid order index', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1', {
          localPath: '/docs/photo-1.jpg',
          orderIndex: -1,
        }),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('ListEntityPhotosUseCase', () => {
    let repository: jest.Mocked<PhotoRepositoryPort>;
    let useCase: ListEntityPhotosUseCase;

    beforeEach(() => {
      repository = createRepository();
      repository.findByEntity.mockResolvedValue([baseRecord]);
      useCase = new ListEntityPhotosUseCase(repository);
    });

    it('lists the album of the referenced entity', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', 'report-1'),
      ).resolves.toEqual([baseRecord]);

      expect(repository.findByEntity).toHaveBeenCalledWith(
        'PARTE_DIARIO',
        'report-1',
      );
    });

    it('returns an empty album when the entity has no photo', async () => {
      repository.findByEntity.mockResolvedValue([]);

      await expect(
        useCase.execute('ACTIVIDAD_MAQUINARIA', 'activity-1'),
      ).resolves.toEqual([]);
    });

    it('rejects an entity type the schema does not support', async () => {
      await expect(
        useCase.execute('LOTE', 'lot-1'),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.findByEntity).not.toHaveBeenCalled();
    });

    it('rejects a missing entity id', async () => {
      await expect(
        useCase.execute('PARTE_DIARIO', ''),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.findByEntity).not.toHaveBeenCalled();
    });
  });

  describe('RemovePhotoUseCase', () => {
    let repository: jest.Mocked<PhotoRepositoryPort>;
    let useCase: RemovePhotoUseCase;

    beforeEach(() => {
      repository = createRepository();
      repository.deleteFromEntity.mockResolvedValue(true);
      useCase = new RemovePhotoUseCase(repository);
    });

    it('removes the photo from its own album', async () => {
      await expect(
        useCase.execute('photo-1', 'PARTE_DIARIO', 'report-1'),
      ).resolves.toBeUndefined();

      expect(repository.deleteFromEntity).toHaveBeenCalledWith(
        'photo-1',
        'PARTE_DIARIO',
        'report-1',
      );
    });

    it('reports a photo that is not in the album as not found', async () => {
      repository.deleteFromEntity.mockResolvedValue(false);

      await expect(
        useCase.execute('photo-1', 'PARTE_DIARIO', 'report-2'),
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects an entity type the schema does not support', async () => {
      await expect(
        useCase.execute('photo-1', 'DAILY_REPORT', 'report-1'),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.deleteFromEntity).not.toHaveBeenCalled();
    });

    it('rejects a missing photo id', async () => {
      await expect(
        useCase.execute('  ', 'PARTE_DIARIO', 'report-1'),
      ).rejects.toThrow(InvalidInputError);
      expect(repository.deleteFromEntity).not.toHaveBeenCalled();
    });
  });
});
