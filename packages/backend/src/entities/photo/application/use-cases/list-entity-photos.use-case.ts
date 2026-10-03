import {
  assertPhotoEntityType,
  assertRequiredText,
} from '../../domain/photo.rules';
import { PhotoRepositoryPort } from '../photo.ports';
import { PhotoRecord } from '../photo.types';

/**
 * Reads the album of one entity. The photo count is a workflow decision, not a
 * read failure, so an entity without photos resolves to an empty list.
 */
export class ListEntityPhotosUseCase {
  constructor(private readonly repository: PhotoRepositoryPort) {}

  async execute(entityType: string, entityId: string): Promise<PhotoRecord[]> {
    const type = assertPhotoEntityType(entityType);
    const ownerId = assertRequiredText(entityId, 'entityId');

    return this.repository.findByEntity(type, ownerId);
  }
}
