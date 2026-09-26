import { InvalidInputError } from './errors';
import {
  assertDistinctLoadOrders,
  assertRecipeHasItems,
  assertValidDose,
  assertValidLoadOrder,
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
  });
});
