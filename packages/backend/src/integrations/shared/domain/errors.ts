/**
 * El tercero respondió con un status de error (4xx/5xx). El body upstream se
 * descarta a propósito: nunca se filtra HTML de terceros al cliente.
 */
export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`The upstream service responded with status ${status} for ${url}`);
    this.name = 'UpstreamError';
  }
}

/** Red caída o timeout: la request no llegó a obtener respuesta usable. */
export class UpstreamUnavailableError extends Error {
  constructor(message = 'The upstream service is unavailable') {
    super(message);
    this.name = 'UpstreamUnavailableError';
  }
}

/** El payload del tercero no matchea la forma esperada por el provider. */
export class UpstreamParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamParseError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}
