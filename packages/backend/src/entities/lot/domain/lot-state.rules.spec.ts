import { deriveLotState, type LotHistory } from './lot-state';

const at = (iso: string): Date => new Date(iso);

function history(partial: Partial<LotHistory>): LotHistory {
  return { labors: [], recipes: [], ...partial };
}

const sowing = { kind: 'SIEMBRA', occurredAt: at('2026-01-01') } as const;
const spray = { kind: 'PULVERIZACION', occurredAt: at('2026-01-01') } as const;
const harvest = { kind: 'COSECHA', occurredAt: at('2026-01-01') } as const;

describe('Lot state domain rules', () => {
  it('reports a lot with no history as libre', () => {
    expect(deriveLotState(history({}))).toBe('libre');
  });

  it('ignores a labour that was never classified', () => {
    expect(
      deriveLotState(
        history({ labors: [{ kind: 'OTRO', occurredAt: at('2026-01-01') }] }),
      ),
    ).toBe('libre');
  });

  it.each([
    ['SIEMBRA', 'sembrado'],
    ['PULVERIZACION', 'aplicado'],
    ['FERTILIZACION', 'aplicado'],
    ['COSECHA', 'cosechado'],
  ] as const)('reports a %s labour as %s', (kind, expected) => {
    expect(
      deriveLotState(history({ labors: [{ kind, occurredAt: at('2026-01-01') }] })),
    ).toBe(expected);
  });

  it('lets an active recipe report an application on its own', () => {
    expect(
      deriveLotState(history({ recipes: [{ occurredAt: at('2026-01-01') }] })),
    ).toBe('aplicado');
  });

  it('takes the most recent event whatever order it arrives in', () => {
    const earlySowing = { kind: 'SIEMBRA', occurredAt: at('2026-01-01') } as const;
    const lateHarvest = { kind: 'COSECHA', occurredAt: at('2026-06-01') } as const;

    expect(
      deriveLotState(history({ labors: [earlySowing, lateHarvest] })),
    ).toBe('cosechado');
    expect(
      deriveLotState(history({ labors: [lateHarvest, earlySowing] })),
    ).toBe('cosechado');
  });

  it('lets a recipe after a sowing turn the lot into aplicado', () => {
    expect(
      deriveLotState(
        history({
          labors: [{ kind: 'SIEMBRA', occurredAt: at('2026-01-01') }],
          recipes: [{ occurredAt: at('2026-02-01') }],
        }),
      ),
    ).toBe('aplicado');
  });

  it('lets a sowing after an application go back to sembrado', () => {
    expect(
      deriveLotState(
        history({
          labors: [
            { kind: 'PULVERIZACION', occurredAt: at('2026-01-01') },
            { kind: 'SIEMBRA', occurredAt: at('2026-02-01') },
          ],
        }),
      ),
    ).toBe('sembrado');
  });

  describe('events on the same day', () => {
    it('prefers the application over the sowing, in either order', () => {
      expect(deriveLotState(history({ labors: [sowing, spray] }))).toBe(
        'aplicado',
      );
      expect(deriveLotState(history({ labors: [spray, sowing] }))).toBe(
        'aplicado',
      );
    });

    it('prefers the harvest over the application, in either order', () => {
      expect(deriveLotState(history({ labors: [spray, harvest] }))).toBe(
        'cosechado',
      );
      expect(deriveLotState(history({ labors: [harvest, spray] }))).toBe(
        'cosechado',
      );
    });

    it('prefers an application over a recipe-free sowing', () => {
      expect(
        deriveLotState(
          history({
            labors: [sowing],
            recipes: [{ occurredAt: at('2026-01-01') }],
          }),
        ),
      ).toBe('aplicado');
    });
  });
});
