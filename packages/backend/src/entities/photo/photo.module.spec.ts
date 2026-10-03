import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PHOTO_ATTACHMENT,
  PHOTO_REPOSITORY,
} from './application/photo.ports';
import { AttachPhotoFromDataUrlUseCase } from './application/use-cases/attach-photo-from-data-url.use-case';
import { AttachPhotoUseCase } from './application/use-cases/attach-photo.use-case';
import { ListEntityPhotosUseCase } from './application/use-cases/list-entity-photos.use-case';
import { RemovePhotoUseCase } from './application/use-cases/remove-photo.use-case';
import { PhotoModule } from './photo.module';

const storedPhoto = {
  id: 'photo-1',
  entityType: 'PARTE_DIARIO' as const,
  entityId: 'report-1',
  localPath: '/docs/photo-1.jpg',
  orderIndex: 0,
  createdAt: new Date('2026-09-25T10:00:00.000Z'),
};

describe('PhotoModule', () => {
  it('wires every photo use case through its port', async () => {
    const repository = {
      findByEntity: jest.fn().mockResolvedValue([]),
      deleteFromEntity: jest.fn().mockResolvedValue(true),
    };
    const attachment = {
      attachWithLimit: jest.fn().mockResolvedValue(storedPhoto),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PhotoModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PHOTO_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PHOTO_ATTACHMENT)
      .useValue(attachment)
      .compile();

    expect(moduleRef.get(AttachPhotoUseCase)).toBeInstanceOf(
      AttachPhotoUseCase,
    );
    expect(moduleRef.get(ListEntityPhotosUseCase)).toBeInstanceOf(
      ListEntityPhotosUseCase,
    );
    expect(moduleRef.get(RemovePhotoUseCase)).toBeInstanceOf(
      RemovePhotoUseCase,
    );
    expect(moduleRef.get(AttachPhotoFromDataUrlUseCase)).toBeInstanceOf(
      AttachPhotoFromDataUrlUseCase,
    );

    const listPhotos = moduleRef.get(ListEntityPhotosUseCase);

    await expect(
      listPhotos.execute('PARTE_DIARIO', 'report-1'),
    ).resolves.toEqual([]);
    expect(repository.findByEntity).toHaveBeenCalledWith(
      'PARTE_DIARIO',
      'report-1',
    );

    const attachPhoto = moduleRef.get(AttachPhotoUseCase);

    await expect(
      attachPhoto.execute('PARTE_DIARIO', 'report-1', {
        localPath: '/docs/photo-1.jpg',
      }),
    ).resolves.toEqual(storedPhoto);
    expect(attachment.attachWithLimit).toHaveBeenCalledWith({
      entityType: 'PARTE_DIARIO',
      entityId: 'report-1',
      localPath: '/docs/photo-1.jpg',
      orderIndex: 0,
    });
  });
});
