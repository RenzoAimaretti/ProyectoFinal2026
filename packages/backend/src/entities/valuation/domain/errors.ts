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
