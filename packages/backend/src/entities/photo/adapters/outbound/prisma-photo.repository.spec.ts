import { AttachPhotoData, PhotoRecord } from '../../application/photo.types';
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
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const repository = new PrismaPhotoRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the photo under the referenced entity', async () => {
    const data: AttachPhotoData = {
      entityType: 'PARTE_DIARIO',
      entityId: 'report-1',
      localPath: '/docs/photo-1.jpg',
      orderIndex: 0,
    };
    prisma.photo.create.mockResolvedValue(persistedPhoto);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.photo.create).toHaveBeenCalledWith({ data });
  });

  it('counts the photos of one entity only', async () => {
    prisma.photo.count.mockResolvedValue(2);

    await expect(
      repository.countByEntity('PARTE_DIARIO', 'report-1'),
    ).resolves.toBe(2);

    expect(prisma.photo.count).toHaveBeenCalledWith({
      where: { entityType: 'PARTE_DIARIO', entityId: 'report-1' },
    });
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
