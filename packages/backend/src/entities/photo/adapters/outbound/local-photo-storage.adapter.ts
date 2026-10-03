import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PhotoStoragePort } from '../../application/photo.ports';
import { StorePhotoInput } from '../../application/photo.types';

/**
 * Directory, relative to the process working directory, where reception photos
 * are written. It matches the static prefix served by `main.ts`.
 */
export const RECEPTION_UPLOADS_DIR = 'uploads/receptions';

/** Public URL prefix the stored files are served from. */
export const RECEPTION_UPLOADS_URL = '/uploads/receptions';

/**
 * Stores image bytes on the local filesystem under
 * `uploads/receptions/<uuid>.<ext>` and returns the public path. The directory
 * is created on demand so a fresh checkout needs no manual setup.
 */
@Injectable()
export class LocalPhotoStorageAdapter implements PhotoStoragePort {
  async store(input: StorePhotoInput): Promise<string> {
    const directory = join(process.cwd(), RECEPTION_UPLOADS_DIR);

    await mkdir(directory, { recursive: true });

    const fileName = `${randomUUID()}.${input.extension}`;

    await writeFile(
      join(directory, fileName),
      Buffer.from(input.base64, 'base64'),
    );

    return `${RECEPTION_UPLOADS_URL}/${fileName}`;
  }
}
