import { Dec } from './decimal';
import { InvalidDecimalError } from './errors';

describe('Dec', () => {
  it('parses plain, negative and exponent notation without losing digits', () => {
    expect(Dec.parse('186000.5000').toString()).toBe('186000.5000');
    expect(Dec.parse('-0.25').toString()).toBe('-0.25');
    expect(Dec.parse('7').toString()).toBe('7');
    expect(Dec.parse('1.5e3').toString()).toBe('1500');
    expect(Dec.parse('1e-7').toString()).toBe('0.0000001');
  });

  it('rejects non numeric input', () => {
    for (const bad of ['', 'abc', '1,5', '1.2.3', ' ', 'NaN', 'Infinity']) {
      expect(() => Dec.parse(bad)).toThrow(InvalidDecimalError);
    }
  });

  it('adds and subtracts exactly where binary floats drift', () => {
    expect(Dec.parse('0.1').add(Dec.parse('0.2')).toString()).toBe('0.3');
    expect(Dec.parse('0.3').sub(Dec.parse('0.1')).toString()).toBe('0.2');
    expect(Dec.parse('1').sub(Dec.parse('2.5')).toString()).toBe('-1.5');
  });

  it('multiplies exactly', () => {
    expect(Dec.parse('600').mul(Dec.parse('310000')).toString()).toBe(
      '186000000',
    );
    expect(Dec.parse('0.1').mul(Dec.parse('0.1')).toString()).toBe('0.01');
  });

  it('divides to a fixed scale rounding half up', () => {
    expect(Dec.parse('1').div(Dec.parse('3'), 4).toString()).toBe('0.3333');
    expect(Dec.parse('2').div(Dec.parse('3'), 4).toString()).toBe('0.6667');
    expect(Dec.parse('186000').div(Dec.parse('310'), 4).toString()).toBe(
      '600.0000',
    );
  });

  it('throws on division by zero', () => {
    expect(() => Dec.parse('1').div(Dec.parse('0'), 2)).toThrow(
      InvalidDecimalError,
    );
  });

  it('rounds half up to the requested places', () => {
    expect(Dec.parse('1.005').roundHalfUp(2).toString()).toBe('1.01');
    expect(Dec.parse('1.004').roundHalfUp(2).toString()).toBe('1.00');
    expect(Dec.parse('2.5').roundHalfUp(0).toString()).toBe('3');
    expect(Dec.parse('7').roundHalfUp(2).toString()).toBe('7.00');
  });

  it('rounds negatives half away from zero', () => {
    expect(Dec.parse('-1.005').roundHalfUp(2).toString()).toBe('-1.01');
  });

  it('compares values regardless of scale', () => {
    expect(Dec.parse('1.50').cmp(Dec.parse('1.5'))).toBe(0);
    expect(Dec.parse('1.51').cmp(Dec.parse('1.5'))).toBe(1);
    expect(Dec.parse('-1').cmp(Dec.parse('0'))).toBe(-1);
    expect(Dec.parse('0.00').isZero()).toBe(true);
    expect(Dec.parse('-0.01').isNegative()).toBe(true);
    expect(Dec.parse('0').isNegative()).toBe(false);
  });
});
