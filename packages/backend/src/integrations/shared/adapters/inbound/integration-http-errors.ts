import {
  BadGatewayException,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  EntityNotFoundError,
  InvalidInputError,
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../domain/errors';

const logger = new Logger('Integrations');

const UPSTREAM_UNAVAILABLE_MESSAGE =
  'El proveedor externo no está disponible. Reintentá en unos minutos.';
const UPSTREAM_INVALID_MESSAGE =
  'El proveedor externo devolvió una respuesta inválida.';

/**
 * Traducción compartida de errores de dominio a HTTP para los controllers de
 * integraciones (design §2.4): 404/400 conservan el mensaje de dominio; en
 * 503/502 el detalle upstream (URL, causa de red) solo va al log del servidor,
 * nunca al cliente.
 */
export function translateIntegrationError(error: unknown): never {
  if (error instanceof EntityNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof InvalidInputError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof UpstreamUnavailableError) {
    logger.warn(error.message);
    throw new ServiceUnavailableException(UPSTREAM_UNAVAILABLE_MESSAGE);
  }

  if (error instanceof UpstreamError || error instanceof UpstreamParseError) {
    logger.warn(error.message);
    throw new BadGatewayException(UPSTREAM_INVALID_MESSAGE);
  }

  throw error;
}
