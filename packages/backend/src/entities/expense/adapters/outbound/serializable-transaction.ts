import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ConcurrentModificationError,
  DuplicateEntityError,
} from '../../domain/errors';

/** Prisma maps a Postgres serialization failure to P2034. */
const SERIALIZATION_FAILURE = 'P2034';
/**
 * The only unique index on these tables that a competing write can hit is the
 * partial one: one PENDIENTE suggestion per expense.
 */
const UNIQUE_VIOLATION = 'P2002';

export type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

/**
 * Runs `work` in one interactive transaction at Serializable isolation and
 * translates the two race outcomes to application errors (both answer 409):
 * P2034 -> "retry" and P2002 on the partial index -> duplicate pending
 * suggestion. Any other error propagates untouched.
 */
export async function runSerializable<T>(
  prisma: PrismaService,
  work: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(work, { isolationLevel: 'Serializable' });
  } catch (error) {
    const code = errorCode(error);
    if (code === SERIALIZATION_FAILURE) {
      throw new ConcurrentModificationError(
        'El gasto se modificó al mismo tiempo: reintentá en unos segundos',
      );
    }
    if (code === UNIQUE_VIOLATION) {
      throw new DuplicateEntityError(
        'El gasto ya tiene una sugerencia pendiente',
      );
    }
    throw error;
  }
}
