import { InvalidInputError } from './errors';
import { LABOR_KINDS, assertLaborKind } from './labor-kind';

describe('Labor kind domain rules', () => {
  it('exposes exactly the vocabulary the lot state derivation needs', () => {
    expect(LABOR_KINDS).toEqual([
      'SIEMBRA',
      'PULVERIZACION',
      'FERTILIZACION',
      'COSECHA',
      'OTRO',
    ]);
  });

  it.each(LABOR_KINDS)('accepts %s', (kind) => {
    expect(assertLaborKind(kind)).toBe(kind);
  });

  it.each([
    ['an unknown word', 'LABRANZA'],
    ['a lowercase member', 'siembra'],
    ['an empty string', ''],
    ['a number', 1],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
    ['an array', ['SIEMBRA']],
  ])('rejects %s with the exact message', (_label, value) => {
    let message = '';

    try {
      assertLaborKind(value);
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidInputError);
      message = (error as Error).message;
    }

    expect(message).toBe(
      'kind must be one of SIEMBRA, PULVERIZACION, FERTILIZACION, COSECHA, OTRO',
    );
  });
});
