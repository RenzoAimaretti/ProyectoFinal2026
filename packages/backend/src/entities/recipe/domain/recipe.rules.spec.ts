import {
  InvalidInputError,
  InvalidRelationError,
  PrescriptionFrozenError,
} from './errors';
import {
  RECIPE_TEXT_MAX_LENGTH,
  assertDistinctLoadOrders,
  assertFiniteDerivedValue,
  assertOptionalRecipeText,
  assertPrescriptionEditable,
  assertPrescriptionLotMatchesTask,
  assertRecipeHasItems,
  assertValidDosageBasis,
  assertValidDose,
  assertValidLoadOrder,
  assertValidLotArea,
  assertValidReapplicationDate,
  assertValidReapplicationIntervalDays,
  assertValidReapplicationPlan,
  assertValidSprayVolume,
  orderRecipeItemsByLoadOrder,
} from './recipe.rules';

describe('Recipe agronomic rules', () => {
  describe('assertValidDose', () => {
    it.each([0.5, 1, 2.75, 120, 0.0001])(
      'accepts the positive dose %p',
      (dose) => {
        expect(assertValidDose(dose, 'dose')).toBe(dose);
      },
    );

    it.each([
      0,
      -1,
      -0.0001,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '2',
      null,
      undefined,
    ])('rejects the invalid dose %p', (dose) => {
      expect(() => assertValidDose(dose, 'dose')).toThrow(InvalidInputError);
    });

    it('names the offending field in the error message', () => {
      expect(() => assertValidDose(0, 'items[0].dose')).toThrow(
        'items[0].dose',
      );
    });
  });

  describe('assertValidSprayVolume', () => {
    it.each([0.5, 1, 100.25, 150, 500]) (
      'accepts the positive spray volume %p',
      (sprayVolume) => {
        expect(assertValidSprayVolume(sprayVolume, 'sprayVolume')).toBe(
          sprayVolume,
        );
      },
    );

    it.each([
      0,
      -1,
      -0.0001,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      '150',
      null,
      undefined,
    ])('rejects the invalid spray volume %p', (sprayVolume) => {
      expect(() =>
        assertValidSprayVolume(sprayVolume, 'sprayVolume'),
      ).toThrow(InvalidInputError);
    });

    it('names the offending field in the error message', () => {
      expect(() => assertValidSprayVolume(0, 'sprayVolume')).toThrow(
        'sprayVolume',
      );
    });
  });

  describe('assertValidLoadOrder', () => {
    it.each([1, 2, 15])('accepts the loading order %p', (loadOrder) => {
      expect(assertValidLoadOrder(loadOrder)).toBe(loadOrder);
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1', null])(
      'rejects the invalid loading order %p',
      (loadOrder) => {
        expect(() => assertValidLoadOrder(loadOrder)).toThrow(
          InvalidInputError,
        );
      },
    );
  });

  describe('assertRecipeHasItems', () => {
    it('accepts a recipe with at least one item', () => {
      expect(() =>
        assertRecipeHasItems([{ inputId: 'input-1', loadOrder: 1 }]),
      ).not.toThrow();
    });

    it('rejects a recipe without items because it cannot instruct a preparation', () => {
      expect(() => assertRecipeHasItems([])).toThrow(InvalidInputError);
    });
  });

  describe('assertDistinctLoadOrders', () => {
    it('accepts distinct loading orders', () => {
      expect(() =>
        assertDistinctLoadOrders([{ loadOrder: 2 }, { loadOrder: 1 }]),
      ).not.toThrow();
    });

    it('rejects a repeated loading order', () => {
      expect(() =>
        assertDistinctLoadOrders([{ loadOrder: 1 }, { loadOrder: 1 }]),
      ).toThrow(InvalidInputError);
    });
  });

  describe('orderRecipeItemsByLoadOrder', () => {
    it('sorts items by loading order without mutating the input', () => {
      const items = [
        { inputId: 'input-c', loadOrder: 3 },
        { inputId: 'input-a', loadOrder: 1 },
        { inputId: 'input-b', loadOrder: 2 },
      ];

      expect(
        orderRecipeItemsByLoadOrder(items).map((item) => item.loadOrder),
      ).toEqual([1, 2, 3]);
      expect(items.map((item) => item.loadOrder)).toEqual([3, 1, 2]);
    });

    it('breaks repeated loading order ties deterministically by input id', () => {
      const items = [
        { inputId: 'input-b', loadOrder: 1 },
        { inputId: 'input-a', loadOrder: 1 },
      ];

      expect(
        orderRecipeItemsByLoadOrder(items).map((item) => item.inputId),
      ).toEqual(['input-a', 'input-b']);
    });

    it('keeps enforcing distinct loading orders across dosage-basis rows', () => {
      const duplicated = [
        { loadOrder: 1, dosageBasis: 'POR_HECTAREA' },
        { loadOrder: 1, dosageBasis: 'CONCENTRACION' },
      ];
      const distinct = [
        { loadOrder: 1, dosageBasis: 'POR_HECTAREA' },
        { loadOrder: 2, dosageBasis: 'CONCENTRACION' },
      ];

      expect(() => assertDistinctLoadOrders(duplicated)).toThrow(
        InvalidInputError,
      );
      expect(() => assertDistinctLoadOrders(distinct)).not.toThrow();
    });
  });

  describe('assertValidDosageBasis', () => {
    it.each(['POR_HECTAREA', 'CONCENTRACION'])(
      'accepts the dosage basis %s',
      (dosageBasis) => {
        expect(assertValidDosageBasis(dosageBasis)).toBe(dosageBasis);
      },
    );

    it.each(['', 'por_hectarea', 'CONCENTRACION %', 1, null, undefined])(
      'rejects the invalid dosage basis %p',
      (dosageBasis) => {
        expect(() => assertValidDosageBasis(dosageBasis)).toThrow(
          InvalidInputError,
        );
      },
    );

    it('names the offending field in the error message', () => {
      expect(() =>
        assertValidDosageBasis('HA', 'items[0].dosageBasis'),
      ).toThrow('items[0].dosageBasis');
    });
  });

  describe('assertValidLotArea', () => {
    it.each([0.5, 1, 3.41, 120])(
      'accepts the positive lot area %p',
      (lotArea) => {
        expect(assertValidLotArea(lotArea)).toBe(lotArea);
      },
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '3', null, undefined])(
      'rejects the invalid lot area %p',
      (lotArea) => {
        expect(() => assertValidLotArea(lotArea)).toThrow(InvalidInputError);
      },
    );
  });

  describe('assertFiniteDerivedValue', () => {
    it.each([0, 0.18, 288, 2.5])(
      'accepts the finite derived value %p',
      (value) => {
        expect(assertFiniteDerivedValue(value, 'items[0].total')).toBe(value);
      },
    );

    it.each([
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      '2',
      null,
      undefined,
    ])('rejects the non-finite derived value %p', (value) => {
      expect(() =>
        assertFiniteDerivedValue(value, 'items[0].per100L'),
      ).toThrow(InvalidInputError);
    });

    it('names the offending field in the error message', () => {
      expect(() =>
        assertFiniteDerivedValue(Number.POSITIVE_INFINITY, 'items[0].per100L'),
      ).toThrow('items[0].per100L');
    });
  });

  describe('assertOptionalRecipeText', () => {
    it.each([undefined, null])(
      'treats %p as absent and returns null',
      (value) => {
        expect(assertOptionalRecipeText(value, 'pest')).toBeNull();
      },
    );

    it('returns the trimmed text when provided', () => {
      expect(assertOptionalRecipeText('  Cochliomyia  ', 'pest')).toBe(
        'Cochliomyia',
      );
    });

    it('treats a blank string as absent', () => {
      expect(assertOptionalRecipeText('   ', 'crop')).toBeNull();
    });

    it('accepts a text of exactly the maximum length', () => {
      const text = 'a'.repeat(RECIPE_TEXT_MAX_LENGTH);

      expect(assertOptionalRecipeText(text, 'pest')).toBe(text);
    });

    it.each([123, true, {}])('rejects the non string value %p', (value) => {
      expect(() => assertOptionalRecipeText(value, 'pest')).toThrow(
        InvalidInputError,
      );
    });

    it('rejects a text over the maximum length', () => {
      const text = 'a'.repeat(RECIPE_TEXT_MAX_LENGTH + 1);

      expect(() => assertOptionalRecipeText(text, 'crop')).toThrow(
        InvalidInputError,
      );
    });
  });

  describe('assertValidReapplicationIntervalDays', () => {
    it.each([undefined, null])('treats %p as absent', (value) => {
      expect(assertValidReapplicationIntervalDays(value)).toBeNull();
    });

    it.each([1, 7, 30])('accepts the positive interval %p', (value) => {
      expect(assertValidReapplicationIntervalDays(value)).toBe(value);
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '7'])(
      'rejects the invalid interval %p',
      (value) => {
        expect(() => assertValidReapplicationIntervalDays(value)).toThrow(
          InvalidInputError,
        );
      },
    );
  });

  describe('assertValidReapplicationDate', () => {
    const prescriptionDate = new Date('2026-03-10T00:00:00.000Z');

    it.each([undefined, null])('treats %p as absent', (value) => {
      expect(assertValidReapplicationDate(value, prescriptionDate)).toBeNull();
    });

    it('accepts a date strictly after the prescription date', () => {
      expect(
        assertValidReapplicationDate(
          '2026-03-17T00:00:00.000Z',
          prescriptionDate,
        ),
      ).toEqual(new Date('2026-03-17T00:00:00.000Z'));
    });

    it.each([
      '2026-03-10T00:00:00.000Z',
      '2026-03-09T00:00:00.000Z',
    ])('rejects the date %s that is not after the prescription date', (value) => {
      expect(() =>
        assertValidReapplicationDate(value, prescriptionDate),
      ).toThrow(InvalidInputError);
    });

    it('rejects an unparseable date', () => {
      expect(() =>
        assertValidReapplicationDate('not-a-date', prescriptionDate),
      ).toThrow(InvalidInputError);
    });
  });

  describe('assertValidReapplicationPlan', () => {
    const prescriptionDate = new Date('2026-03-10T00:00:00.000Z');

    it('accepts an interval without a date', () => {
      expect(
        assertValidReapplicationPlan(
          { reapplicationIntervalDays: 7 },
          prescriptionDate,
        ),
      ).toEqual({ intervalDays: 7, date: null });
    });

    it('accepts a date without an interval', () => {
      expect(
        assertValidReapplicationPlan(
          { reapplicationDate: '2026-03-17T00:00:00.000Z' },
          prescriptionDate,
        ),
      ).toEqual({
        intervalDays: null,
        date: new Date('2026-03-17T00:00:00.000Z'),
      });
    });

    it('accepts both fields together', () => {
      expect(
        assertValidReapplicationPlan(
          {
            reapplicationIntervalDays: 14,
            reapplicationDate: '2026-03-24T00:00:00.000Z',
          },
          prescriptionDate,
        ),
      ).toEqual({
        intervalDays: 14,
        date: new Date('2026-03-24T00:00:00.000Z'),
      });
    });

    it('returns an empty plan when neither field is provided', () => {
      expect(assertValidReapplicationPlan({}, prescriptionDate)).toEqual({
        intervalDays: null,
        date: null,
      });
    });

    it('rejects a re-application date that is not after the prescription date', () => {
      expect(() =>
        assertValidReapplicationPlan(
          { reapplicationDate: '2026-03-09T00:00:00.000Z' },
          prescriptionDate,
        ),
      ).toThrow(InvalidInputError);
    });
  });

  describe('assertPrescriptionLotMatchesTask', () => {
    it('accepts a prescription whose lot matches the task lot', () => {
      expect(() =>
        assertPrescriptionLotMatchesTask('lot-1', 'lot-1'),
      ).not.toThrow();
    });

    it('rejects a prescription whose lot differs from the task lot', () => {
      expect(() =>
        assertPrescriptionLotMatchesTask('lot-2', 'lot-1'),
      ).toThrow(InvalidRelationError);
    });
  });

  describe('assertPrescriptionEditable', () => {
    it.each(['PENDIENTE', 'CANCELADA'] as const)(
      'keeps the prescription editable while the task is %s',
      (status) => {
        expect(() => assertPrescriptionEditable({ status })).not.toThrow();
      },
    );

    it.each(['EN_PROGRESO', 'FINALIZADA'] as const)(
      'freezes the prescription once the task is %s',
      (status) => {
        expect(() => assertPrescriptionEditable({ status })).toThrow(
          PrescriptionFrozenError,
        );
      },
    );

    it('names the task status in the error message', () => {
      expect(() =>
        assertPrescriptionEditable({ status: 'EN_PROGRESO' }),
      ).toThrow('EN_PROGRESO');
    });
  });
});
