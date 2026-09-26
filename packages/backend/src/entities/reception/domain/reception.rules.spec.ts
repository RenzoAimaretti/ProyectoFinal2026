import { InvalidInputError, InvalidStateTransitionError } from './errors';
import {
  RECEPTION_INITIAL_STATUS,
  ReceptionStatus,
} from './reception-status';
import {
  assertDistinctItemInputs,
  assertPendingValidation,
  assertPositiveNumber,
  assertRejectionReason,
  assertValidationCoversItems,
  itemQuantityVariance,
} from './reception.rules';

describe('Reception domain rules', () => {
  describe('assertPositiveNumber', () => {
    it('returns the received quantity when it is strictly positive', () => {
      expect(assertPositiveNumber(12.5, 'items[0].quantity')).toBe(12.5);
    });

    it.each([
      ['zero', 0],
      ['a negative number', -3],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a numeric string', '12.5'],
      ['a missing value', undefined],
    ])('rejects %s', (_label, value) => {
      expect(() => assertPositiveNumber(value, 'quantity')).toThrow(
        InvalidInputError,
      );
    });
  });

  describe('assertDistinctItemInputs', () => {
    it('accepts items that reference different inputs', () => {
      expect(() =>
        assertDistinctItemInputs([
          { inputId: 'input-1' },
          { inputId: 'input-2' },
        ]),
      ).not.toThrow();
    });

    it('rejects a repeated input', () => {
      expect(() =>
        assertDistinctItemInputs([
          { inputId: 'input-1' },
          { inputId: 'input-1' },
        ]),
      ).toThrow(InvalidInputError);
    });
  });

  describe('assertValidationCoversItems', () => {
    const declared = [
      { inputId: 'input-1' },
      { inputId: 'input-2' },
    ];

    it('accepts a decision that validates exactly the declared inputs', () => {
      expect(() =>
        assertValidationCoversItems(declared, [
          { inputId: 'input-1' },
          { inputId: 'input-2' },
        ]),
      ).not.toThrow();
    });

    it('rejects a declared input that was left unvalidated', () => {
      expect(() =>
        assertValidationCoversItems(declared, [{ inputId: 'input-1' }]),
      ).toThrow(InvalidInputError);
    });

    it('rejects an input that is not part of the reception', () => {
      expect(() =>
        assertValidationCoversItems(declared, [
          { inputId: 'input-1' },
          { inputId: 'input-2' },
          { inputId: 'input-3' },
        ]),
      ).toThrow(InvalidInputError);
    });

    it('rejects the same input validated more than once', () => {
      expect(() =>
        assertValidationCoversItems(declared, [
          { inputId: 'input-1' },
          { inputId: 'input-1' },
          { inputId: 'input-2' },
        ]),
      ).toThrow(InvalidInputError);
    });
  });

  describe('itemQuantityVariance', () => {
    it('returns no variance for an item that is still pending validation', () => {
      expect(
        itemQuantityVariance({ quantity: 10, validatedQuantity: null }),
      ).toBeNull();
    });

    it('returns a positive surplus when the validated quantity exceeds the expected one', () => {
      expect(
        itemQuantityVariance({ quantity: 10, validatedQuantity: 11.5 }),
      ).toBe(1.5);
    });

    it('returns a negative shortage when the validated quantity is below the expected one', () => {
      expect(
        itemQuantityVariance({ quantity: 10, validatedQuantity: 7 }),
      ).toBe(-3);
    });

    it('returns zero when the validated quantity matches the expected one', () => {
      expect(
        itemQuantityVariance({ quantity: 10, validatedQuantity: 10 }),
      ).toBe(0);
    });
  });

  describe('assertPendingValidation', () => {
    it('accepts a reception that still awaits validation', () => {
      expect(() =>
        assertPendingValidation({ status: RECEPTION_INITIAL_STATUS }),
      ).not.toThrow();
    });

    it.each<ReceptionStatus>(['VALIDADA', 'RECHAZADA'])(
      'rejects a reception already decided as %s',
      (status) => {
        expect(() => assertPendingValidation({ status })).toThrow(
          InvalidStateTransitionError,
        );
      },
    );
  });

  describe('assertRejectionReason', () => {
    it('returns the trimmed reason', () => {
      expect(assertRejectionReason('  cantidad distinta  ')).toBe(
        'cantidad distinta',
      );
    });

    it.each([
      ['an empty reason', ''],
      ['a blank reason', '   '],
      ['a non string reason', 7],
      ['a missing reason', undefined],
    ])('rejects %s', (_label, value) => {
      expect(() => assertRejectionReason(value)).toThrow(InvalidInputError);
    });
  });
});
