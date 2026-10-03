import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientModule } from '../client/client.module';
import { ReceptionModule } from '../reception/reception.module';
import {
  PHOTO_ATTACHMENT,
  PHOTO_REPOSITORY,
  PHOTO_STORAGE,
  PhotoAttachmentPort,
  PhotoRepositoryPort,
  PhotoStoragePort,
} from './application/photo.ports';
import { AttachPhotoFromDataUrlUseCase } from './application/use-cases/attach-photo-from-data-url.use-case';
import { AttachPhotoUseCase } from './application/use-cases/attach-photo.use-case';
import { ListEntityPhotosUseCase } from './application/use-cases/list-entity-photos.use-case';
import { RemovePhotoUseCase } from './application/use-cases/remove-photo.use-case';
import { PhotoController } from './adapters/inbound/photo.controller';
import { LocalPhotoStorageAdapter } from './adapters/outbound/local-photo-storage.adapter';
import { PrismaPhotoAttachmentAdapter } from './adapters/outbound/prisma-photo-attachment.adapter';
import { PrismaPhotoRepository } from './adapters/outbound/prisma-photo.repository';

@Module({
  imports: [PrismaModule, ReceptionModule, ClientModule],
  controllers: [PhotoController],
  providers: [
    PrismaPhotoRepository,
    { provide: PHOTO_REPOSITORY, useExisting: PrismaPhotoRepository },
    PrismaPhotoAttachmentAdapter,
    { provide: PHOTO_ATTACHMENT, useExisting: PrismaPhotoAttachmentAdapter },
    LocalPhotoStorageAdapter,
    { provide: PHOTO_STORAGE, useExisting: LocalPhotoStorageAdapter },
    {
      provide: AttachPhotoUseCase,
      useFactory: (attachment: PhotoAttachmentPort) =>
        new AttachPhotoUseCase(attachment),
      inject: [PHOTO_ATTACHMENT],
    },
    {
      provide: ListEntityPhotosUseCase,
      useFactory: (repository: PhotoRepositoryPort) =>
        new ListEntityPhotosUseCase(repository),
      inject: [PHOTO_REPOSITORY],
    },
    {
      provide: RemovePhotoUseCase,
      useFactory: (repository: PhotoRepositoryPort) =>
        new RemovePhotoUseCase(repository),
      inject: [PHOTO_REPOSITORY],
    },
    {
      provide: AttachPhotoFromDataUrlUseCase,
      useFactory: (
        storage: PhotoStoragePort,
        attachment: PhotoAttachmentPort,
      ) => new AttachPhotoFromDataUrlUseCase(storage, attachment),
      inject: [PHOTO_STORAGE, PHOTO_ATTACHMENT],
    },
  ],
  exports: [
    AttachPhotoUseCase,
    ListEntityPhotosUseCase,
    RemovePhotoUseCase,
    AttachPhotoFromDataUrlUseCase,
  ],
})
export class PhotoModule {}
