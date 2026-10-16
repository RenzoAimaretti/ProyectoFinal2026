import { InvalidInputError } from './errors';
import { normalizeDosageUnit } from './dosage-unit';

describe('Dosage unit normalisation', () => {
  describe('POR_HECTAREA derives a per hectare rate', () => {
    it.each([
      ['L', 'L/ha'],
      ['kg', 'kg/ha'],
      [' L ', 'L/ha'],
      ['L/ha', 'L/ha'],
      ['L / HA', 'L/ha'],
      ['kg/ha', 'kg/ha'],
      ['L/100 L', 'L/ha'],
      ['L/100L', 'L/ha'],
    ])('normalises %p to %p', (unit, expected) => {
      expect(normalizeDosageUnit(unit, 'POR_HECTAREA')).toBe(expected);
    });
  });

  describe('CONCENTRACION derives a per 100 L rate', () => {
    it.each([
      ['L', 'L/100 L'],
      ['kg', 'kg/100 L'],
      [' L/100 L ', 'L/100 L'],
      ['L/ha', 'L/100 L'],
      ['L/100L', 'L/100 L'],
      ['l/100l', 'l/100 L'],
    ])('normalises %p to %p', (unit, expected) => {
      expect(normalizeDosageUnit(unit, 'CONCENTRACION')).toBe(expected);
    });
  });

  it('stays null when the caller sends no unit', () => {
    expect(normalizeDosageUnit(null, 'POR_HECTAREA')).toBeNull();
    expect(normalizeDosageUnit(undefined, 'CONCENTRACION')).toBeNull();
    expect(normalizeDosageUnit('   ', 'POR_HECTAREA')).toBeNull();
  });

  it('is idempotent: applying it twice yields the same unit', () => {
    const hectare = normalizeDosageUnit('L', 'POR_HECTAREA');
    const concentration = normalizeDosageUnit('L', 'CONCENTRACION');

    expect(normalizeDosageUnit(hectare, 'POR_HECTAREA')).toBe(hectare);
    expect(normalizeDosageUnit(concentration, 'CONCENTRACION')).toBe(
      concentration,
    );
  });

  it('strips a rate suffix that does not match the basis before re-deriving', () => {
    expect(normalizeDosageUnit('kg/100L', 'POR_HECTAREA')).toBe('kg/ha');
    expect(normalizeDosageUnit('kg/ha', 'CONCENTRACION')).toBe('kg/100 L');
  });

  it('rejects a unit that is not text', () => {
    expect(() => normalizeDosageUnit(42, 'POR_HECTAREA')).toThrow(
      InvalidInputError,
    );
  });

  it('rejects an invalid basis before deriving a unit', () => {
    expect(() => normalizeDosageUnit('L', 'POR_LITRO')).toThrow(
      InvalidInputError,
    );
  });
});
