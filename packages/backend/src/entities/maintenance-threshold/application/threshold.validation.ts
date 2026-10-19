export class InvalidThresholdError extends Error {}
export class ThresholdNotFoundError extends Error {}

export function validScope(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new InvalidThresholdError(`${label} is required`);
  return value.trim();
}

export function validLimits(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InvalidThresholdError('At least one limit is required');
  const body = input as Record<string, unknown>;
  const limit = (value: unknown, label: string) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new InvalidThresholdError(`${label} must be a positive number`);
    return value;
  };
  const hoursLimit = limit(body.hoursLimit, 'hoursLimit');
  const hectaresLimit = limit(body.hectaresLimit, 'hectaresLimit');
  if (hoursLimit === null && hectaresLimit === null) throw new InvalidThresholdError('At least one limit is required');
  return { hoursLimit, hectaresLimit };
}
