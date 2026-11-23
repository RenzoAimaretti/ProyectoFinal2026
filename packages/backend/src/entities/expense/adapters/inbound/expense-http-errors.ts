import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { translateIntegrationError } from '../../../../integrations/shared/adapters/inbound/integration-http-errors';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import {
  ConcurrentModificationError,
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
} from '../../domain/errors';

/** D25: no price, no expense; there is no later retry for expenses. */
const MARKET_UNAVAILABLE_MESSAGE =
  'El precio de mercado no está disponible. Reintentá en unos minutos o cargá el gasto en ARS.';

/** Translates application errors to HTTP; unknown errors propagate. */
export async function handleExpenseErrors<T>(
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }
    if (
      error instanceof DuplicateEntityError ||
      error instanceof PendingSuggestionError ||
      error instanceof SuggestionAlreadyResolvedError ||
      error instanceof ConcurrentModificationError
    ) {
      throw new ConflictException(error.message);
    }
    if (error instanceof MarketUnavailableError) {
      throw new ServiceUnavailableException(MARKET_UNAVAILABLE_MESSAGE);
    }
    // Upstream errors: generic message to the client, detail only in the log.
    return translateIntegrationError(error);
  }
}
