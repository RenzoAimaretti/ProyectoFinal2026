import { EntityNotFoundError } from '../../domain/errors';
import {
  assertPhotoEntityType,
  assertRequiredText,
} from '../../domain/photo.rules';
import { PhotoRepositoryPort } from '../photo.ports';

/**
 * Removes a photo from its own album. The outbound adapter deletes by
 * `(id, entityType, entityId)` so a photo can never be removed through a
 * different album than the one that owns it.
 */
export class RemovePhotoUseCase {
  constructor(private readonly repository: PhotoRepositoryPort) {}

  async execute(
    id: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const photoId = assertRequiredText(id, 'id');
    const type = assertPhotoEntityType(entityType);
    const ownerId = assertRequiredText(entityId, 'entityId');

    const removed = await this.repository.deleteFromEntity(
      photoId,
      type,
      ownerId,
    );

    if (!removed) {
      throw new EntityNotFoundError(
        `Photo with id ${photoId} not found for ${type} ${ownerId}`,
      );
    }
  }
}
