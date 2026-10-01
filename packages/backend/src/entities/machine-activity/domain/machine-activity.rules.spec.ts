import { InvalidInputError } from './errors';
import { MACHINE_ACTIVITY_TYPES } from './machine-activity-type';
import {
  assertMachineActivityFields,
  assertMachineActivityType,
  assertNotFutureDate,
  isMachineActivityType,
} from './machine-activity.rules';

const now = new Date('2026-03-10T12:00:00.000Z');
const pastActivity = new Date('2026-03-09T08:00:00.000Z');
const futureActivity = new Date('2026-03-11T08:00:00.000Z');

const baseFields = {
  type: 'COMBUSTIBLE' as const,
  date: pastActivity,
  liters: 120,
  cost: null,
  spareParts: null,
  usageHours: null,
  hectares: null,
};

describe('machine activity domain rules', () => {
  describe('assertMachineActivityType', () => {
    it.each(MACHINE_ACTIVITY_TYPES)('accepts the %s type', (type) => {
      expect(assertMachineActivityType(type)).toBe(type);
      expect(isMachineActivityType(type)).toBe(true);
    });

    it.each([
      ['an unknown type', 'VIAJE'],
      ['a lowercase type', 'combustible'],
      ['a missing type', undefined],
    ])('rejects %s', (_label, value) => {
      expect(() => assertMachineActivityType(value)).toThrow(InvalidInputError);
      expect(isMachineActivityType(value)).toBe(false);
    });
  });

  describe('assertNotFutureDate', () => {
    it('accepts a past date', () => {
      expect(() => assertNotFutureDate(pastActivity, now)).not.toThrow();
    });

    it('accepts the current instant', () => {
      expect(() => assertNotFutureDate(now, now)).not.toThrow();
    });

    it('rejects a future date', () => {
      expect(() => assertNotFutureDate(futureActivity, now)).toThrow(
        InvalidInputError,
      );
    });
  });

  describe('assertMachineActivityFields', () => {
    it('rejects a future activity before looking at the type fields', () => {
      expect(() =>
        assertMachineActivityFields(
          { ...baseFields, date: futureActivity },
          now,
        ),
      ).toThrow(InvalidInputError);
    });

    it('requires positive liters for fuel', () => {
      expect(() =>
        assertMachineActivityFields({ ...baseFields, liters: 0 }, now),
      ).toThrow(InvalidInputError);

      expect(() =>
        assertMachineActivityFields({ ...baseFields, liters: null }, now),
      ).toThrow(InvalidInputError);

      expect(() =>
        assertMachineActivityFields({ ...baseFields, liters: 120 }, now),
      ).not.toThrow();
    });

    it.each(['MANTENIMIENTO', 'REPARACION'] as const)(
      'requires a positive cost and a work description for %s',
      (type) => {
        expect(() =>
          assertMachineActivityFields(
            {
              ...baseFields,
              type,
              liters: null,
              cost: 50000,
              spareParts: null,
            },
            now,
          ),
        ).toThrow(InvalidInputError);

        expect(() =>
          assertMachineActivityFields(
            {
              ...baseFields,
              type,
              liters: null,
              cost: 0,
              spareParts: 'Cambio de bomba',
            },
            now,
          ),
        ).toThrow(InvalidInputError);

        expect(() =>
          assertMachineActivityFields(
            {
              ...baseFields,
              type,
              liters: null,
              cost: 50000,
              spareParts: 'Cambio de bomba',
            },
            now,
          ),
        ).not.toThrow();
      },
    );

    it('requires positive usage hours and hectares for field usage', () => {
      expect(() =>
        assertMachineActivityFields(
          {
            ...baseFields,
            type: 'USO_CAMPO',
            liters: null,
            usageHours: 8,
            hectares: 0,
          },
          now,
        ),
      ).toThrow(InvalidInputError);

      expect(() =>
        assertMachineActivityFields(
          {
            ...baseFields,
            type: 'USO_CAMPO',
            liters: null,
            usageHours: 0,
            hectares: 12,
          },
          now,
        ),
      ).toThrow(InvalidInputError);

      expect(() =>
        assertMachineActivityFields(
          {
            ...baseFields,
            type: 'USO_CAMPO',
            liters: null,
            usageHours: 8,
            hectares: 12,
          },
          now,
        ),
      ).not.toThrow();
    });
  });
});
