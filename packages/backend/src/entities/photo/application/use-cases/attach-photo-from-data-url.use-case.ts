import {
  assertOrderIndex,
  assertPhotoEntityType,
  assertRequiredText,
  parsePhotoDataUrl,
} from '../../domain/photo.rules';
import { PhotoAttachmentPort, PhotoStoragePort } from '../photo.ports';
import { AttachPhotoFromDataUrlInput, PhotoRecord } from '../photo.types';

/**
 * Attaches a photo whose bytes arrive as a base64 data URL. The data URL is
 * validated (mime and 6 MB limit) before anything is written, then the decoded
 * payload is stored through `PhotoStoragePort`, and only then the album slot is
 * claimed through `PhotoAttachmentPort`, which enforces the five-photo limit
 * atomically with the insert.
 *
 * If the album is full the file has already been written; the orphan is left in
 * place rather than growing the storage port with a best-effort delete that the
 * limit rejection would race against.
 */
export class AttachPhotoFromDataUrlUseCase {
  constructor(
    private readonly storage: PhotoStoragePort,
    private readonly attachment: PhotoAttachmentPort,
  ) {}

  async execute(
    entityType: string,
    entityId: string,
    input: AttachPhotoFromDataUrlInput,
  ): Promise<PhotoRecord> {
    const type = assertPhotoEntityType(entityType);
    const ownerId = assertRequiredText(entityId, 'entityId');
    const orderIndex = assertOrderIndex(input.orderIndex);
    const parsed = parsePhotoDataUrl(input.dataUrl);

    const localPath = await this.storage.store({
      extension: parsed.extension,
      base64: parsed.base64,
    });

    return this.attachment.attachWithLimit({
      entityType: type,
      entityId: ownerId,
      localPath,
      orderIndex,
    });
  }
}
