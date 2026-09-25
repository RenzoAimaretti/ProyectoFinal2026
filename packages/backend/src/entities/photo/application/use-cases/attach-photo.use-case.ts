import {
  assertOrderIndex,
  assertPhotoEntityType,
  assertRequiredText,
} from '../../domain/photo.rules';
import { PhotoAttachmentPort } from '../photo.ports';
import { AttachPhotoData, AttachPhotoInput, PhotoRecord } from '../photo.types';

/**
 * Attaches one photo to the album of an entity. The R008 limit (an album never
 * holds more than five photos) is enforced by the attachment capability inside
 * the same transaction as the insert, so concurrent attachments cannot both
 * claim the last slot.
 */
export class AttachPhotoUseCase {
  constructor(private readonly attachment: PhotoAttachmentPort) {}

  async execute(
    entityType: string,
    entityId: string,
    input: AttachPhotoInput,
  ): Promise<PhotoRecord> {
    const type = assertPhotoEntityType(entityType);
    const ownerId = assertRequiredText(entityId, 'entityId');
    const localPath = assertRequiredText(input.localPath, 'localPath');
    const orderIndex = assertOrderIndex(input.orderIndex);

    const data: AttachPhotoData = {
      entityType: type,
      entityId: ownerId,
      localPath,
      orderIndex,
    };

    return this.attachment.attachWithLimit(data);
  }
}
