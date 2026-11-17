import { RecipeRecord } from './recipe.types';
import { withPrescriptionTotals } from './recipe.totals';

const record: RecipeRecord = {
  id: 'recipe-1',
  lotId: 'lot-1',
  taskId: 'task-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  pest: null,
  crop: null,
  observations: null,
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  reapplicationIntervalDays: null,
  reapplicationDate: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  lotArea: 96,
  items: [
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L/ha',
      loadOrder: 1,
    },
    {
      id: 'item-2',
      recipeId: 'recipe-1',
      inputId: 'input-2',
      dose: 1.5,
      dosageBasis: 'CONCENTRACION',
      unit: 'L/100 L',
      loadOrder: 2,
    },
  ],
};

describe('withPrescriptionTotals', () => {
  it('adds the caldo total and the three amounts per row', () => {
    const output = withPrescriptionTotals(record, 96);

    expect(output.caldoTotal).toBe(11520);
    expect(output.items).toEqual([
      { ...record.items[0], total: 288, perHectare: 3, per100L: 2.5 },
      { ...record.items[1], total: 172.8, perHectare: 1.8, per100L: 1.5 },
    ]);
  });

  it('is additive: the stored fields are preserved and the record is not mutated', () => {
    const output = withPrescriptionTotals(record, 96);

    expect(output).toMatchObject({
      id: 'recipe-1',
      lotId: 'lot-1',
      sprayVolume: 120,
      sprayVolumeUnit: 'L/ha',
    });
    expect(output.items[0]).toMatchObject({ unit: 'L/ha', dose: 3 });
    expect(record.items[0]).not.toHaveProperty('total');
  });

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns the recipe unchanged when the lot area is unusable (%p)',
    (lotArea) => {
      expect(withPrescriptionTotals(record, lotArea)).toBe(record);
    },
  );

  it('matches the totals to the rows by position when an input repeats', () => {
    const repeated: RecipeRecord = {
      ...record,
      items: [
        {
          id: 'item-1',
          recipeId: 'recipe-1',
          inputId: 'input-1',
          dose: 3,
          dosageBasis: 'POR_HECTAREA',
          unit: 'L/ha',
          loadOrder: 1,
        },
        {
          id: 'item-2',
          recipeId: 'recipe-1',
          inputId: 'input-1',
          dose: 1.5,
          dosageBasis: 'CONCENTRACION',
          unit: 'L/100 L',
          loadOrder: 2,
        },
      ],
    };

    const output = withPrescriptionTotals(repeated, 96);

    expect(output.items.map((item) => item.total)).toEqual([288, 172.8]);
    expect(output.items.map((item) => item.perHectare)).toEqual([3, 1.8]);
    expect(output.items.map((item) => item.per100L)).toEqual([2.5, 1.5]);
  });

  it('treats a missing dosage basis as POR_HECTAREA', () => {
    const legacy: RecipeRecord = {
      ...record,
      items: [
        {
          id: 'item-1',
          recipeId: 'recipe-1',
          inputId: 'input-1',
          dose: 3,
          unit: 'L/ha',
          loadOrder: 1,
        },
      ],
    };

    const output = withPrescriptionTotals(legacy, 96);

    expect(output.items[0]).toEqual({
      ...legacy.items[0],
      total: 288,
      perHectare: 3,
      per100L: 2.5,
    });
  });
});
