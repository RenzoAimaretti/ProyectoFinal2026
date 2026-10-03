import { AttachPhotoData, PhotoRecord } from '../../application/photo.types';
import { PhotoLimitExceededError } from '../../domain/errors';
import { PrismaPhotoAttachmentAdapter } from './prisma-photo-attachment.adapter';

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

const data: AttachPhotoData = {
  entityType: 'PARTE_DIARIO',
  entityId: 'report-1',
  localPath: '/docs/photo-1.jpg',
  orderIndex: 0,
};

const serializationConflict = () =>
  Object.assign(new Error('Transaction failed due to a write conflict'), {
    code: 'P2034',
  });

describe('PrismaPhotoAttachmentAdapter', () => {
  const tx = {
    photo: {
      count: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    photo: {
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const adapter = new PrismaPhotoAttachmentAdapter(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.photo.count.mockResolvedValue(0);
    tx.photo.create.mockResolvedValue(persistedPhoto);
  });

  it('counts and inserts inside one serializable transaction', async () => {
    await expect(adapter.attachWithLimit(data)).resolves.toEqual(
      expectedRecord,
    );

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(tx.photo.count).toHaveBeenCalledWith({
      where: { entityType: 'PARTE_DIARIO', entityId: 'report-1' },
    });
    expect(tx.photo.create).toHaveBeenCalledWith({ data });
  });

  it('never writes outside the transaction', async () => {
    await adapter.attachWithLimit(data);

    expect(prisma.photo.count).not.toHaveBeenCalled();
    expect(prisma.photo.create).not.toHaveBeenCalled();
  });

  it.each([0, 1, 4])('accepts an album that holds %i photos', async (count) => {
    tx.photo.count.mockResolvedValue(count);

    await expect(adapter.attachWithLimit(data)).resolves.toEqual(
      expectedRecord,
    );
  });

  it('rejects the sixth photo from inside the transaction without inserting it', async () => {
    tx.photo.count.mockResolvedValue(5);

    await expect(adapter.attachWithLimit(data)).rejects.toBeInstanceOf(
      PhotoLimitExceededError,
    );
    expect(tx.photo.create).not.toHaveBeenCalled();
  });

  it('retries a serialization conflict and re-reads the album', async () => {
    // The first attempt runs the count and the insert, then conflicts at
    // commit, so its write is rolled back. The retry must start over.
    prisma.$transaction
      .mockImplementationOnce(async (callback: (client: typeof tx) => unknown) => {
        await callback(tx);
        throw serializationConflict();
      })
      .mockImplementationOnce((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      );
    tx.photo.count.mockResolvedValue(4);

    await expect(adapter.attachWithLimit(data)).resolves.toEqual(
      expectedRecord,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.photo.count).toHaveBeenCalledTimes(2);
    expect(tx.photo.create).toHaveBeenCalledTimes(2);
  });

  it('rejects the sixth photo when a concurrent attachment wins the last slot', async () => {
    // Both attempts read four photos; the competitor commits the fifth while
    // the first attempt is in flight, so Postgres aborts it with a
    // serialization conflict and rolls back its insert. The retry must read
    // the album again and find it full instead of inserting a sixth photo.
    prisma.$transaction
      .mockImplementationOnce(async (callback: (client: typeof tx) => unknown) => {
        await callback(tx);
        throw serializationConflict();
      })
      .mockImplementationOnce((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      );
    tx.photo.count.mockResolvedValueOnce(4).mockResolvedValueOnce(5);

    await expect(adapter.attachWithLimit(data)).rejects.toBeInstanceOf(
      PhotoLimitExceededError,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.photo.count).toHaveBeenCalledTimes(2);
    expect(tx.photo.create).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget and surfaces the conflict', async () => {
    const conflict = serializationConflict();
    prisma.$transaction.mockImplementation(() => Promise.reject(conflict));

    await expect(adapter.attachWithLimit(data)).rejects.toBe(conflict);

    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry a limit rejection', async () => {
    tx.photo.count.mockResolvedValue(5);

    await expect(adapter.attachWithLimit(data)).rejects.toBeInstanceOf(
      PhotoLimitExceededError,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
