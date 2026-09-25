import { InvalidInputError } from './errors';
import {
  assertDistinctItemInputs,
  assertPositiveNumber,
} from './daily-report.rules';

describe('daily report domain rules', () => {
  describe('assertPositiveNumber', () => {
    it.each([
      ['a zero value', 0],
      ['a negative value', -1],
      ['a non finite value', Number.NaN],
      ['a non numeric value', '5'],
      ['a missing value', undefined],
    ])('rejects %s', (_label, value) => {
      expect(() => assertPositiveNumber(value, 'hectares')).toThrow(
        InvalidInputError,
      );
    });

    it('returns the value when it is a positive number', () => {
      expect(assertPositiveNumber(12.5, 'hectares')).toBe(12.5);
    });
  });

  describe('assertDistinctItemInputs', () => {
    it('rejects two items that reference the same input', () => {
      expect(() =>
        assertDistinctItemInputs([
          { inputId: 'input-1' },
          { inputId: 'input-1' },
        ]),
      ).toThrow(InvalidInputError);
    });

    it('accepts items that reference distinct inputs', () => {
      expect(() =>
        assertDistinctItemInputs([
          { inputId: 'input-1' },
          { inputId: 'input-2' },
        ]),
      ).not.toThrow();
    });
  });
});
