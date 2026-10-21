import { GeoJsonPolygon, LotPolygon } from '../domain/lot-polygon';
import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertPositiveNumber(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a positive number`);
  }

  return value;
}

/**
 * Absent or null means "no polygon supplied in this write", which CUU02 allows:
 * creating a lot and delimiting it are separate moments. Any other value must
 * satisfy every rule of the frozen polygon contract, or it is rejected with the
 * exact message the domain produced.
 */
export function assertOptionalPolygon(
  value: unknown,
): GeoJsonPolygon | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return LotPolygon.fromGeoJson(value).toGeoJson();
}
