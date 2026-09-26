import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PhotoAttachmentPort } from '../../application/photo.ports';
import { AttachPhotoData, PhotoRecord } from '../../application/photo.types';
import { assertPhotoLimit } from '../../domain/photo.rules';
import { toPhotoRecord } from './photo.mapper';

/**
 * Postgres reports a serialization failure with SQLSTATE 40001 and a deadlock
 * with 40P01; Prisma maps the interactive-transaction conflict to P2034. All
 * three mean the attempt lost the race and may be replayed.
 */
const SERIALIZATION_CONFLICT_CODES: readonly string[] = [
  'P2034',
  '40001',
  '40P01',
];

/**
 * The retry budget is small on purpose: the retry only helps an attachment
 * that lost a race for a genuinely free slot, and each retry re-reads the
 * album. A retry that finds the album full rejects with the domain error.
 */
const MAX_ATTACH_ATTEMPTS = 3;

function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { code } = error as { code?: unknown };

  return (
    typeof code === 'string' && SERIALIZATION_CONFLICT_CODES.includes(code)
  );
}

/**
 * Attaches a photo and enforces the five-photo limit of its album (R008,
 * CUU06/R014).
 *
 * The count and the insert run inside one interactive transaction at
 * PostgreSQL `SERIALIZABLE` isolation. Postgres tracks the predicate read and
 * the insert of a row that matches it, so two concurrent attachments into the
 * same `(entityType, entityId)` album form the dependency cycle that the
 * serializable snapshot-isolation detector aborts. The aborted attempt is
 * replayed, and its retry re-reads the album: if another transaction consumed
 * the last slot, the retry rejects with `PhotoLimitExceededError` instead of
 * persisting a sixth photo. A conflicting attempt therefore never commits a
 * sixth row; at worst it surfaces the retry budget as a conflict error.
 */
@Injectable()
export class PrismaPhotoAttachmentAdapter implements PhotoAttachmentPort {
  constructor(private readonly prisma: PrismaService) {}

  async attachWithLimit(data: AttachPhotoData): Promise<PhotoRecord> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.attachWithinSerializableTransaction(data);
      } catch (error) {
        if (
          attempt >= MAX_ATTACH_ATTEMPTS ||
          !isSerializationConflict(error)
        ) {
          throw error;
        }
      }
    }
  }

  private attachWithinSerializableTransaction(
    data: AttachPhotoData,
  ): Promise<PhotoRecord> {
    return this.prisma.$transaction(
      async (tx) => {
        const currentCount = await tx.photo.count({
          where: { entityType: data.entityType, entityId: data.entityId },
        });

        assertPhotoLimit(data.entityType, data.entityId, currentCount);

        const photo = await tx.photo.create({ data });

        return toPhotoRecord(photo);
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
