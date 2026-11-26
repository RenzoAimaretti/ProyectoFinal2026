import { InvalidDecimalError } from './errors';

const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/**
 * Decimal exacto e inmutable: `units / 10^scale` sobre BigInt. No depende de
 * Prisma ni de librerias; solo las operaciones que necesita la valorizacion.
 */
export class Dec {
  private constructor(
    private readonly units: bigint,
    private readonly scale: number,
  ) {}

  static parse(input: string): Dec {
    const match = DECIMAL_PATTERN.exec(input);
    if (!match) {
      throw new InvalidDecimalError(`Invalid decimal: "${input}"`);
    }

    const [, sign, integer, fraction = '', exponent = '0'] = match;
    const shift = Number(exponent);
    let units = BigInt(integer + fraction);
    let scale = fraction.length - shift;

    if (scale < 0) {
      units *= pow10(-scale);
      scale = 0;
    }

    return new Dec(sign ? -units : units, scale);
  }

  add(other: Dec): Dec {
    const scale = Math.max(this.scale, other.scale);
    return new Dec(this.rescaled(scale) + other.rescaled(scale), scale);
  }

  sub(other: Dec): Dec {
    const scale = Math.max(this.scale, other.scale);
    return new Dec(this.rescaled(scale) - other.rescaled(scale), scale);
  }

  mul(other: Dec): Dec {
    return new Dec(this.units * other.units, this.scale + other.scale);
  }

  /** Divide y redondea mitad hacia arriba (lejos de cero) a `scale` decimales. */
  div(other: Dec, scale: number): Dec {
    if (other.units === 0n) {
      throw new InvalidDecimalError('Division by zero');
    }

    // this/other = (a / 10^sa) / (b / 10^sb) = a * 10^sb / (b * 10^sa)
    // Resultado con `scale` decimales: a * 10^(sb + scale) / (b * 10^sa).
    const numerator = this.units * pow10(other.scale + scale);
    const denominator = other.units * pow10(this.scale);
    return new Dec(
      Dec.divideRoundHalfAwayFromZero(numerator, denominator),
      scale,
    );
  }

  roundHalfUp(places: number): Dec {
    if (this.scale <= places) {
      return new Dec(this.rescaled(places), places);
    }

    const divisor = pow10(this.scale - places);
    return new Dec(
      Dec.divideRoundHalfAwayFromZero(this.units, divisor),
      places,
    );
  }

  cmp(other: Dec): -1 | 0 | 1 {
    const scale = Math.max(this.scale, other.scale);
    const left = this.rescaled(scale);
    const right = other.rescaled(scale);
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }

  isZero(): boolean {
    return this.units === 0n;
  }

  isNegative(): boolean {
    return this.units < 0n;
  }

  toString(): string {
    const negative = this.units < 0n;
    const digits = (negative ? -this.units : this.units).toString();

    if (this.scale === 0) {
      return (negative ? '-' : '') + digits;
    }

    const padded = digits.padStart(this.scale + 1, '0');
    const integer = padded.slice(0, padded.length - this.scale);
    const fraction = padded.slice(padded.length - this.scale);
    return `${negative ? '-' : ''}${integer}.${fraction}`;
  }

  private rescaled(scale: number): bigint {
    return this.units * pow10(scale - this.scale);
  }

  private static divideRoundHalfAwayFromZero(
    numerator: bigint,
    denominator: bigint,
  ): bigint {
    const negative = numerator < 0n !== denominator < 0n;
    const n = numerator < 0n ? -numerator : numerator;
    const d = denominator < 0n ? -denominator : denominator;
    const quotient = n / d;
    const remainder = n % d;
    const rounded = remainder * 2n >= d ? quotient + 1n : quotient;
    return negative ? -rounded : rounded;
  }
}
