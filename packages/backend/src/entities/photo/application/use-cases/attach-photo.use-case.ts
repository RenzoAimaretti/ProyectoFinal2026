import {
  assertOrderIndex,
  assertPhotoEntityType,
  assertPhotoLimit,
  assertRequiredText,
} from '../../domain/photo.rules';
import { PhotoRepositoryPort } from '../photo.ports';
import { AttachPhotoData, AttachPhotoInput, PhotoRecord } from '../photo.types';

/**
 * Attaches one photo to the album of an entity after checking the R008 limit:
 * an album never holds more than five photos.
 */
export class AttachPhotoUseCase {
  constructor(private readonly repository: PhotoRepositoryPort) {}

  async execute(
    entityType: string,
    entityId: string,
    input: AttachPhotoInput,
  ): Promise<PhotoRecord> {
    const type = assertPhotoEntityType(entityType);
    const ownerId = assertRequiredText(entityId, 'entityId');
    const localPath = assertRequiredText(input.localPath, 'localPath');
    const orderIndex = assertOrderIndex(input.orderIndex);

    const currentCount = await this.repository.countByEntity(type, ownerId);
    assertPhotoLimit(type, ownerId, currentCount);

    const data: AttachPhotoData = {
      entityType: type,
      entityId: ownerId,
      localPath,
      orderIndex,
    };

    return this.repository.create(data);
  }
}
