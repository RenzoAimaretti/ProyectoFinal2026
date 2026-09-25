import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PHOTO_REPOSITORY } from './application/photo.ports';
import { AttachPhotoUseCase } from './application/use-cases/attach-photo.use-case';
import { ListEntityPhotosUseCase } from './application/use-cases/list-entity-photos.use-case';
import { RemovePhotoUseCase } from './application/use-cases/remove-photo.use-case';
import { PhotoModule } from './photo.module';

describe('PhotoModule', () => {
  it('wires every photo use case through its port', async () => {
    const repository = {
      countByEntity: jest.fn().mockResolvedValue(0),
      findByEntity: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      deleteFromEntity: jest.fn().mockResolvedValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PhotoModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PHOTO_REPOSITORY)
      .useValue(repository)
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

    const listPhotos = moduleRef.get(ListEntityPhotosUseCase);

    await expect(
      listPhotos.execute('PARTE_DIARIO', 'report-1'),
    ).resolves.toEqual([]);
    expect(repository.findByEntity).toHaveBeenCalledWith(
      'PARTE_DIARIO',
      'report-1',
    );
  });
});
