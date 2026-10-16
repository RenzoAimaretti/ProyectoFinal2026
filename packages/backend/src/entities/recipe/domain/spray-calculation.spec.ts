import { InvalidInputError } from './errors';
import {
  PrescriptionTotals,
  SprayCalculationInput,
  calculatePrescriptionTotals,
  roundTo2,
} from './spray-calculation';

describe('Spray volume and dose calculation', () => {
  describe('roundTo2', () => {
    it('rounds a value to two decimals', () => {
      expect(roundTo2(7.6725)).toBe(7.67);
      expect(roundTo2(0.605957)).toBe(0.61);
      expect(roundTo2(60.5957)).toBe(60.6);
    });

    it('leaves a value with two decimals unchanged', () => {
      expect(roundTo2(25)).toBe(25);
      expect(roundTo2(2.5)).toBe(2.5);
    });
  });

  describe('calculatePrescriptionTotals', () => {
    it('computes the caldo total and both dosage bases for one lot', () => {
      const totals = calculatePrescriptionTotals({
        sprayVolume: 200,
        lotArea: 10,
        items: [
          { inputId: 'input-1', dose: 2.5, dosageBasis: 'POR_HECTAREA' },
          { inputId: 'input-2', dose: 1, dosageBasis: 'CONCENTRACION' },
        ],
      });

      // caldoTotal = 200 L/ha * 10 ha = 2000 L
      // input-1 = 2.5 L/ha * 10 ha = 25 L -> 2.5 L/ha, 1.25 L/100 L
      // input-2 = 1 per 100 L * 2000 L / 100 = 20 L -> 2 L/ha, 1 L/100 L
      expect(totals).toEqual({
        caldoTotal: 2000,
        items: [
          { inputId: 'input-1', total: 25, perHectare: 2.5, per100L: 1.25 },
          { inputId: 'input-2', total: 20, perHectare: 2, per100L: 1 },
        ],
      });
    });

    it('computes each row independently on a multi-row prescription', () => {
      const totals = calculatePrescriptionTotals({
        sprayVolume: 200,
        lotArea: 10,
        items: [
          { inputId: 'input-1', dose: 2.5, dosageBasis: 'POR_HECTAREA' },
          { inputId: 'input-2', dose: 1, dosageBasis: 'CONCENTRACION' },
          { inputId: 'input-3', dose: 0.75, dosageBasis: 'POR_HECTAREA' },
        ],
      });

      expect(totals.caldoTotal).toBe(2000);
      expect(totals.items).toEqual([
        { inputId: 'input-1', total: 25, perHectare: 2.5, per100L: 1.25 },
        { inputId: 'input-2', total: 20, perHectare: 2, per100L: 1 },
        { inputId: 'input-3', total: 7.5, perHectare: 0.75, per100L: 0.38 },
      ]);
    });

    it('rounds the caldo total and every row total to two decimals', () => {
      const totals = calculatePrescriptionTotals({
        sprayVolume: 17.77,
        lotArea: 3.41,
        items: [
          { inputId: 'input-1', dose: 2.25, dosageBasis: 'POR_HECTAREA' },
          { inputId: 'input-2', dose: 1, dosageBasis: 'CONCENTRACION' },
        ],
      });

      // caldoTotal raw = 17.77 * 3.41 = 60.5957 -> 60.6
      // input-1 raw = 2.25 * 3.41 = 7.6725 -> 7.67 ; perHectarea 2.25 ; per100L 12.66
      // input-2 raw = 1 * 60.5957 / 100 = 0.605957 -> 0.61 ; perHectarea 0.18 ; per100L 1
      expect(totals).toEqual({
        caldoTotal: 60.6,
        items: [
          { inputId: 'input-1', total: 7.67, perHectare: 2.25, per100L: 12.66 },
          { inputId: 'input-2', total: 0.61, perHectare: 0.18, per100L: 1 },
        ],
      });
    });

    it('treats the concentration dose as an amount per 100 L of water', () => {
      const totals = calculatePrescriptionTotals({
        sprayVolume: 100,
        lotArea: 1,
        items: [{ inputId: 'input-1', dose: 1, dosageBasis: 'CONCENTRACION' }],
      });

      // caldoTotal = 100 L, so a mix of 1 per 100 L needs 1 L of product.
      expect(totals.caldoTotal).toBe(100);
      expect(totals.items).toEqual([
        { inputId: 'input-1', total: 1, perHectare: 1, per100L: 1 },
      ]);
    });

    it.each([
      ['zero lot area', 0],
      ['negative lot area', -3],
      ['non finite lot area', Number.NaN],
      ['infinite lot area', Number.POSITIVE_INFINITY],
      ['non numeric lot area', '10'],
    ])('rejects an invalid %s', (_label, lotArea) => {
      expect(() =>
        calculatePrescriptionTotals({
          sprayVolume: 100,
          lotArea,
          items: [{ inputId: 'input-1', dose: 2, dosageBasis: 'POR_HECTAREA' }],
        } as unknown as SprayCalculationInput),
      ).toThrow(InvalidInputError);
    });

    it.each([
      ['zero spray volume', 0],
      ['negative spray volume', -5],
      ['non finite spray volume', Number.NaN],
      ['infinite spray volume', Number.POSITIVE_INFINITY],
      ['non numeric spray volume', '200'],
    ])('rejects an invalid %s', (_label, sprayVolume) => {
      expect(() =>
        calculatePrescriptionTotals({
          sprayVolume,
          lotArea: 10,
          items: [{ inputId: 'input-1', dose: 2, dosageBasis: 'POR_HECTAREA' }],
        } as unknown as SprayCalculationInput),
      ).toThrow(InvalidInputError);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '2'])(
      'rejects the invalid row dose %p',
      (dose) => {
        expect(() =>
          calculatePrescriptionTotals({
            sprayVolume: 100,
            lotArea: 10,
            items: [
              {
                inputId: 'input-1',
                dose: dose as number,
                dosageBasis: 'POR_HECTAREA',
              },
            ],
          }),
        ).toThrow(InvalidInputError);
      },
    );

    it('rejects an unknown dosage basis', () => {
      expect(() =>
        calculatePrescriptionTotals({
          sprayVolume: 100,
          lotArea: 10,
          items: [
            {
              inputId: 'input-1',
              dose: 2,
              dosageBasis: 'PER_LITRE' as never,
            },
          ],
        }),
      ).toThrow(InvalidInputError);
    });

    it('names the offending item in the error message', () => {
      expect(() =>
        calculatePrescriptionTotals({
          sprayVolume: 100,
          lotArea: 10,
          items: [{ inputId: 'input-1', dose: 0, dosageBasis: 'POR_HECTAREA' }],
        }),
      ).toThrow('items[0].dose');
    });

    it('is pure: same inputs give the same outputs and the input is not mutated', () => {
      const input: SprayCalculationInput = {
        sprayVolume: 150,
        lotArea: 4.2,
        items: [
          { inputId: 'input-1', dose: 2.5, dosageBasis: 'POR_HECTAREA' },
          { inputId: 'input-2', dose: 0.5, dosageBasis: 'CONCENTRACION' },
        ],
      };
      const snapshot = JSON.parse(JSON.stringify(input));

      const first: PrescriptionTotals = calculatePrescriptionTotals(input);
      const second = calculatePrescriptionTotals(input);

      expect(first).toEqual(second);
      expect(JSON.parse(JSON.stringify(input))).toEqual(snapshot);
    });

    describe('derived per-hectare and per-100 L amounts (decision 14)', () => {
      it('matches the ground-truth fixture for both bases', () => {
        const totals = calculatePrescriptionTotals({
          sprayVolume: 120,
          lotArea: 96,
          items: [
            { inputId: 'input-1', dose: 3, dosageBasis: 'POR_HECTAREA' },
            { inputId: 'input-2', dose: 1.5, dosageBasis: 'CONCENTRACION' },
          ],
        });

        expect(totals.caldoTotal).toBe(11520);
        expect(totals.items).toEqual([
          { inputId: 'input-1', total: 288, perHectare: 3, per100L: 2.5 },
          { inputId: 'input-2', total: 172.8, perHectare: 1.8, per100L: 1.5 },
        ]);
      });

      it('reads back the entered dose as perHectare for a POR_HECTAREA row', () => {
        const totals = calculatePrescriptionTotals({
          sprayVolume: 120,
          lotArea: 96,
          items: [{ inputId: 'input-1', dose: 3, dosageBasis: 'POR_HECTAREA' }],
        });

        expect(totals.items[0].perHectare).toBe(3);
      });

      it('reads back the entered dose as per100L for a CONCENTRACION row', () => {
        const totals = calculatePrescriptionTotals({
          sprayVolume: 120,
          lotArea: 96,
          items: [
            { inputId: 'input-1', dose: 1.5, dosageBasis: 'CONCENTRACION' },
          ],
        });

        expect(totals.items[0].per100L).toBe(1.5);
      });

      it('produces only finite numbers, including with fractional areas', () => {
        const totals = calculatePrescriptionTotals({
          sprayVolume: 0.5,
          lotArea: 0.33,
          items: [
            { inputId: 'input-1', dose: 0.001, dosageBasis: 'POR_HECTAREA' },
            { inputId: 'input-2', dose: 0.002, dosageBasis: 'CONCENTRACION' },
          ],
        });

        expect(Number.isFinite(totals.caldoTotal)).toBe(true);

        for (const item of totals.items) {
          expect(Number.isFinite(item.total)).toBe(true);
          expect(Number.isFinite(item.perHectare)).toBe(true);
          expect(Number.isFinite(item.per100L)).toBe(true);
        }
      });

      it('rejects a derived value that overflows to Infinity', () => {
        expect(() =>
          calculatePrescriptionTotals({
            sprayVolume: 1e308,
            lotArea: 1e308,
            items: [
              { inputId: 'input-1', dose: 1e308, dosageBasis: 'POR_HECTAREA' },
            ],
          }),
        ).toThrow(InvalidInputError);
      });
    });
  });
});
