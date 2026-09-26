import { PhotoRecord } from '../../application/photo.types';
import { PrismaPhotoRepository } from './prisma-photo.repository';

const persistedPhoto = {
  id: 'photo-1',
  entityType: 'PARTE_DIARIO',
  entityId: 'report-1',
  localPath: '/docs/photo-1.jpg',
  orderIndex: 0,
  createdAt: new Date('2026-09-25T10:00:00.000Z'),
};

const expectedRecord: PhotoRecord = {
  id: 'photo-1',
  entityType: 'PARTE_DIARIO',
  entityId: 'report-1',
  localPath: '/docs/photo-1.jpg',
  orderIndex: 0,
  createdAt: new Date('2026-09-25T10:00:00.000Z'),
};

describe('PrismaPhotoRepository', () => {
  const prisma = {
    photo: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const repository = new PrismaPhotoRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists one album ordered by its stored order index', async () => {
    prisma.photo.findMany.mockResolvedValue([persistedPhoto]);

    await expect(
      repository.findByEntity('PARTE_DIARIO', 'report-1'),
    ).resolves.toEqual([expectedRecord]);

    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { entityType: 'PARTE_DIARIO', entityId: 'report-1' },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('returns an empty album when the entity has no photo', async () => {
    prisma.photo.findMany.mockResolvedValue([]);

    await expect(
      repository.findByEntity('RECEPCION', 'reception-1'),
    ).resolves.toEqual([]);
  });

  it('deletes only a photo that belongs to the given album', async () => {
    prisma.photo.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.deleteFromEntity('photo-1', 'PARTE_DIARIO', 'report-1'),
    ).resolves.toBe(true);

    expect(prisma.photo.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'photo-1',
        entityType: 'PARTE_DIARIO',
        entityId: 'report-1',
      },
    });
  });

  it('reports a photo outside the album as not deleted', async () => {
    prisma.photo.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.deleteFromEntity('photo-1', 'PARTE_DIARIO', 'report-2'),
    ).resolves.toBe(false);
  });
});
