import { InvalidInputError } from '../../shared/domain/errors';

/**
 * El lote y su campo no permiten resolver una ubicación usable. Se traduce a
 * `400 Bad Request` en el controller, en lugar de inventar coordenadas.
 */
export class WeatherLocationUnresolvedError extends InvalidInputError {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherLocationUnresolvedError';
  }
}
