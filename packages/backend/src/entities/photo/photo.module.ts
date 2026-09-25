import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PHOTO_REPOSITORY,
  PhotoRepositoryPort,
} from './application/photo.ports';
import { AttachPhotoUseCase } from './application/use-cases/attach-photo.use-case';
import { ListEntityPhotosUseCase } from './application/use-cases/list-entity-photos.use-case';
import { RemovePhotoUseCase } from './application/use-cases/remove-photo.use-case';
import { PrismaPhotoRepository } from './adapters/outbound/prisma-photo.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaPhotoRepository,
    { provide: PHOTO_REPOSITORY, useExisting: PrismaPhotoRepository },
    {
      provide: AttachPhotoUseCase,
      useFactory: (repository: PhotoRepositoryPort) =>
        new AttachPhotoUseCase(repository),
      inject: [PHOTO_REPOSITORY],
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
