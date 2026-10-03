import { InvalidInputError, InvalidStateTransitionError } from './errors';
import {
  assertDistinctItemInputs,
  assertPendingApproval,
  assertPositiveNumber,
  assertRejectionReason,
} from './daily-report.rules';
import { DailyReportStatus } from './daily-report-status';

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

  describe('assertPendingApproval', () => {
    it('accepts a daily report that still awaits approval', () => {
      expect(() => assertPendingApproval('PENDIENTE_APROBACION')).not.toThrow();
    });

    it.each<DailyReportStatus>(['APROBADO', 'RECHAZADO'])(
      'rejects a report already decided as %s',
      (status) => {
        expect(() => assertPendingApproval(status)).toThrow(
          InvalidStateTransitionError,
        );
      },
    );
  });

  describe('assertRejectionReason', () => {
    it.each([
      ['an empty reason', ''],
      ['a whitespace reason', '   '],
      ['a missing reason', undefined],
      ['a non string reason', 42],
    ])('rejects %s', (_label, value) => {
      expect(() => assertRejectionReason(value)).toThrow(InvalidInputError);
    });

    it('returns the trimmed reason', () => {
      expect(assertRejectionReason('  fuera de fecha  ')).toBe(
        'fuera de fecha',
      );
    });
  });
});
