export class InvalidDecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDecimalError';
  }
}

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

/**
 * Falta un dato de mercado requerido para valorizar (precio de grano "S/C",
 * proveedor caido). Nunca se inventa un valor ni se usa 0.
 */
export class MarketUnavailableError extends Error {
  constructor(message = 'Precio no disponible') {
    super(message);
    this.name = 'MarketUnavailableError';
  }
}

/** The report to value does not exist, belongs to another company or is not approved. */
export class EntityNotFoundError extends Error {
  constructor(message = 'Entity not found') {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}
