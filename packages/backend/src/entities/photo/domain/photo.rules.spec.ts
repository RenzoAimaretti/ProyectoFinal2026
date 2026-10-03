import { InvalidInputError, PhotoLimitExceededError } from './errors';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ENTITY,
  assertOrderIndex,
  assertPhotoEntityType,
  assertPhotoLimit,
  assertRequiredText,
  isPhotoEntityType,
  parsePhotoDataUrl,
} from './photo.rules';

describe('Photo domain rules', () => {
  describe('assertPhotoEntityType', () => {
    it.each(['PARTE_DIARIO', 'RECEPCION', 'ACTIVIDAD_MAQUINARIA'])(
      'accepts the schema entity type %s',
      (value) => {
        expect(assertPhotoEntityType(value)).toBe(value);
      },
    );

    it.each([
      ['an unknown entity type', 'LOTE'],
      ['the mobile-only name of a known entity', 'DAILY_REPORT'],
      ['a numeric value', 7],
      ['a missing value', undefined],
    ])('rejects %s', (_label, value) => {
      expect(() => assertPhotoEntityType(value)).toThrow(InvalidInputError);
    });
  });

  describe('isPhotoEntityType', () => {
    it('reports a supported entity type as photo owner', () => {
      expect(isPhotoEntityType('RECEPCION')).toBe(true);
    });

    it('reports an unsupported value as not a photo owner', () => {
      expect(isPhotoEntityType('RECEPTION')).toBe(false);
    });
  });

  describe('assertRequiredText', () => {
    it('returns the trimmed text', () => {
      expect(assertRequiredText('  /docs/photo-1.jpg  ', 'localPath')).toBe(
        '/docs/photo-1.jpg',
      );
    });

    it.each([
      ['an empty string', ''],
      ['a blank string', '   '],
      ['null', null],
      ['a missing value', undefined],
      ['a number', 12],
    ])('rejects %s', (_label, value) => {
      expect(() => assertRequiredText(value, 'localPath')).toThrow(
        InvalidInputError,
      );
    });

    it('names the offending field', () => {
      expect(() => assertRequiredText('', 'entityId')).toThrow('entityId');
    });
  });

  describe('assertOrderIndex', () => {
    it('defaults a missing order index to the schema default', () => {
      expect(assertOrderIndex(undefined)).toBe(0);
    });

    it('keeps an explicit order index', () => {
      expect(assertOrderIndex(3)).toBe(3);
    });

    it.each([
      ['a negative index', -1],
      ['a fractional index', 1.5],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a numeric string', '2'],
      ['null', null],
    ])('rejects %s', (_label, value) => {
      expect(() => assertOrderIndex(value)).toThrow(InvalidInputError);
    });
  });

  describe('assertPhotoLimit', () => {
    it('uses a limit of five photos per entity', () => {
      expect(MAX_PHOTOS_PER_ENTITY).toBe(5);
    });

    it('accepts an album still below the limit', () => {
      expect(() =>
        assertPhotoLimit('PARTE_DIARIO', 'report-1', MAX_PHOTOS_PER_ENTITY - 1),
      ).not.toThrow();
    });

    it('rejects a further photo once the album is full', () => {
      expect(() =>
        assertPhotoLimit('PARTE_DIARIO', 'report-1', MAX_PHOTOS_PER_ENTITY),
      ).toThrow(PhotoLimitExceededError);
    });

    it('names the full album in the error', () => {
      expect(() => assertPhotoLimit('RECEPCION', 'reception-9', 5)).toThrow(
        'RECEPCION reception-9',
      );
    });
  });

  describe('parsePhotoDataUrl', () => {
    it.each([
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
      ['image/jpg', 'jpg'],
      ['image/webp', 'webp'],
    ])('accepts %s and maps it to .%s', (mimeType, extension) => {
      const parsed = parsePhotoDataUrl(`data:${mimeType};base64,AA==`);

      expect(parsed.mimeType).toBe(mimeType);
      expect(parsed.extension).toBe(extension);
      expect(parsed.base64).toBe('AA==');
      expect(parsed.byteLength).toBe(1);
    });

    it('accepts a decoded payload exactly at the 6 MB limit', () => {
      const base64 = Buffer.alloc(MAX_PHOTO_BYTES).toString('base64');

      expect(() =>
        parsePhotoDataUrl(`data:image/png;base64,${base64}`),
      ).not.toThrow();
    });

    it('rejects a decoded payload above the 6 MB limit', () => {
      const base64 = Buffer.alloc(MAX_PHOTO_BYTES + 1).toString('base64');

      expect(() =>
        parsePhotoDataUrl(`data:image/png;base64,${base64}`),
      ).toThrow(InvalidInputError);
    });

    it.each([
      ['a missing value', undefined],
      ['an empty string', ''],
      ['a non-image data URL', 'data:text/plain;base64,AA=='],
      ['an unsupported image type', 'data:image/gif;base64,AA=='],
      ['a data URL without the base64 marker', 'data:image/png,AA=='],
      ['a raw URL', 'https://cdn.example.com/photo.png'],
      ['base64 with invalid characters', 'data:image/png;base64,AAAA$'],
      ['base64 whose length is not a multiple of four', 'data:image/png;base64,AAA'],
    ])('rejects %s', (_label, value) => {
      expect(() => parsePhotoDataUrl(value)).toThrow(InvalidInputError);
    });
  });
});
