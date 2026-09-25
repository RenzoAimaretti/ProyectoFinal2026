import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PHOTO_ATTACHMENT,
  PHOTO_REPOSITORY,
  PhotoAttachmentPort,
  PhotoRepositoryPort,
} from './application/photo.ports';
import { AttachPhotoUseCase } from './application/use-cases/attach-photo.use-case';
import { ListEntityPhotosUseCase } from './application/use-cases/list-entity-photos.use-case';
import { RemovePhotoUseCase } from './application/use-cases/remove-photo.use-case';
import { PrismaPhotoAttachmentAdapter } from './adapters/outbound/prisma-photo-attachment.adapter';
import { PrismaPhotoRepository } from './adapters/outbound/prisma-photo.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaPhotoRepository,
    { provide: PHOTO_REPOSITORY, useExisting: PrismaPhotoRepository },
    PrismaPhotoAttachmentAdapter,
    { provide: PHOTO_ATTACHMENT, useExisting: PrismaPhotoAttachmentAdapter },
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
  ],
  exports: [AttachPhotoUseCase, ListEntityPhotosUseCase, RemovePhotoUseCase],
})
export class PhotoModule {}
