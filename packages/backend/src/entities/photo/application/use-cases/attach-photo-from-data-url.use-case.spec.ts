import { InvalidInputError, PhotoLimitExceededError } from '../../domain/errors';
import { MAX_PHOTO_BYTES } from '../../domain/photo.rules';
import { PhotoAttachmentPort, PhotoStoragePort } from '../photo.ports';
import { PhotoRecord } from '../photo.types';
import { AttachPhotoFromDataUrlUseCase } from './attach-photo-from-data-url.use-case';

const storedRecord: PhotoRecord = {
  id: 'photo-1',
  entityType: 'RECEPCION',
  entityId: 'reception-1',
  localPath: '/uploads/receptions/generated.png',
  orderIndex: 1,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
};

const PNG_DATA_URL = 'data:image/png;base64,AA==';

function createStorage(): jest.Mocked<PhotoStoragePort> {
  return { store: jest.fn() };
}

function createAttachment(): jest.Mocked<PhotoAttachmentPort> {
  return { attachWithLimit: jest.fn() };
}

describe('AttachPhotoFromDataUrlUseCase', () => {
  let storage: jest.Mocked<PhotoStoragePort>;
  let attachment: jest.Mocked<PhotoAttachmentPort>;
  let useCase: AttachPhotoFromDataUrlUseCase;

  beforeEach(() => {
    storage = createStorage();
    storage.store.mockResolvedValue('/uploads/receptions/generated.png');
    attachment = createAttachment();
    attachment.attachWithLimit.mockResolvedValue(storedRecord);
    useCase = new AttachPhotoFromDataUrlUseCase(storage, attachment);
  });

  it('stores the decoded image and then claims the album slot', async () => {
    await expect(
      useCase.execute('RECEPCION', 'reception-1', {
        dataUrl: PNG_DATA_URL,
        orderIndex: 1,
      }),
    ).resolves.toEqual(storedRecord);

    expect(storage.store).toHaveBeenCalledWith({
      extension: 'png',
      base64: 'AA==',
    });
    expect(attachment.attachWithLimit).toHaveBeenCalledWith({
      entityType: 'RECEPCION',
      entityId: 'reception-1',
      localPath: '/uploads/receptions/generated.png',
      orderIndex: 1,
    });
  });

  it('defaults the order index to the schema default', async () => {
    await useCase.execute('RECEPCION', 'reception-1', {
      dataUrl: PNG_DATA_URL,
    });

    expect(attachment.attachWithLimit).toHaveBeenCalledWith(
      expect.objectContaining({ orderIndex: 0 }),
    );
  });

  it('rejects an unsupported mime type before writing anything', async () => {
    await expect(
      useCase.execute('RECEPCION', 'reception-1', {
        dataUrl: 'data:image/gif;base64,AA==',
      }),
    ).rejects.toThrow(InvalidInputError);

    expect(storage.store).not.toHaveBeenCalled();
    expect(attachment.attachWithLimit).not.toHaveBeenCalled();
  });

  it('rejects a payload above the decoded size limit before writing anything', async () => {
    const oversized = `data:image/png;base64,${Buffer.alloc(
      MAX_PHOTO_BYTES + 1,
    ).toString('base64')}`;

    await expect(
      useCase.execute('RECEPCION', 'reception-1', { dataUrl: oversized }),
    ).rejects.toThrow(InvalidInputError);

    expect(storage.store).not.toHaveBeenCalled();
  });

  it('rejects an entity type the schema does not support', async () => {
    await expect(
      useCase.execute('DAILY_REPORT', 'reception-1', {
        dataUrl: PNG_DATA_URL,
      }),
    ).rejects.toThrow(InvalidInputError);

    expect(storage.store).not.toHaveBeenCalled();
  });

  it('propagates the album limit of the attachment capability', async () => {
    attachment.attachWithLimit.mockRejectedValue(
      new PhotoLimitExceededError('RECEPCION', 'reception-1', 5),
    );

    await expect(
      useCase.execute('RECEPCION', 'reception-1', { dataUrl: PNG_DATA_URL }),
    ).rejects.toBeInstanceOf(PhotoLimitExceededError);

    expect(storage.store).toHaveBeenCalledTimes(1);
  });
});
