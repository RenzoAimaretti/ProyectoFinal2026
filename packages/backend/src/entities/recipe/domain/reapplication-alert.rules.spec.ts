import {
  calculateDaysRemaining,
  calculateReapplicationTargetDate,
  evaluateReapplicationAlert,
} from './reapplication-alert.rules';

describe('reapplication alert rules (R010)', () => {
  const baseDate = new Date('2026-11-10T10:00:00Z');

  describe('calculateReapplicationTargetDate', () => {
    it('returns null when neither date nor interval is set', () => {
      expect(
        calculateReapplicationTargetDate({
          recipeDate: baseDate,
          reapplicationDate: null,
          reapplicationIntervalDays: null,
        }),
      ).toBeNull();
    });

    it('returns explicit reapplicationDate when provided', () => {
      const explicitDate = new Date('2026-11-20T00:00:00Z');
      const target = calculateReapplicationTargetDate({
        recipeDate: baseDate,
        reapplicationDate: explicitDate,
        reapplicationIntervalDays: 14,
      });

      expect(target).toEqual(explicitDate);
    });

    it('computes target date by adding interval days to recipe date when date is omitted', () => {
      const target = calculateReapplicationTargetDate({
        recipeDate: baseDate,
        reapplicationDate: null,
        reapplicationIntervalDays: 7,
      });

      expect(target).toEqual(new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    });
  });

  describe('calculateDaysRemaining', () => {
    it('returns positive whole days for future dates', () => {
      const target = new Date('2026-11-15T00:00:00Z');
      const now = new Date('2026-11-12T15:30:00Z');
      expect(calculateDaysRemaining(target, now)).toBe(3);
    });

    it('returns 0 for same calendar day', () => {
      const target = new Date('2026-11-12T08:00:00Z');
      const now = new Date('2026-11-12T20:00:00Z');
      expect(calculateDaysRemaining(target, now)).toBe(0);
    });

    it('returns negative whole days for past dates', () => {
      const target = new Date('2026-11-10T00:00:00Z');
      const now = new Date('2026-11-12T00:00:00Z');
      expect(calculateDaysRemaining(target, now)).toBe(-2);
    });
  });

  describe('evaluateReapplicationAlert', () => {
    it('returns null when no reapplication target exists', () => {
      const alert = evaluateReapplicationAlert(
        { recipeDate: baseDate },
        new Date('2026-11-12T00:00:00Z'),
      );
      expect(alert).toBeNull();
    });

    it('marks overdue alerts when target date is past', () => {
      const targetDate = new Date('2026-11-12T00:00:00Z');
      const now = new Date('2026-11-15T00:00:00Z');

      const alert = evaluateReapplicationAlert(
        { recipeDate: baseDate, reapplicationDate: targetDate },
        now,
      );

      expect(alert).toEqual({
        targetDate,
        daysRemaining: -3,
        urgency: 'OVERDUE',
        isDue: true,
      });
    });

    it('marks due today when target date matches today', () => {
      const targetDate = new Date('2026-11-15T00:00:00Z');
      const now = new Date('2026-11-15T14:00:00Z');

      const alert = evaluateReapplicationAlert(
        { recipeDate: baseDate, reapplicationDate: targetDate },
        now,
      );

      expect(alert).toEqual({
        targetDate,
        daysRemaining: 0,
        urgency: 'DUE_TODAY',
        isDue: true,
      });
    });

    it('marks upcoming when target date is within horizon (e.g. 2 days)', () => {
      const targetDate = new Date('2026-11-17T00:00:00Z');
      const now = new Date('2026-11-15T10:00:00Z');

      const alert = evaluateReapplicationAlert(
        { recipeDate: baseDate, reapplicationDate: targetDate },
        now,
        3,
      );

      expect(alert).toEqual({
        targetDate,
        daysRemaining: 2,
        urgency: 'UPCOMING',
        isDue: false,
      });
    });

    it('returns null when target date is beyond upcoming horizon', () => {
      const targetDate = new Date('2026-11-25T00:00:00Z');
      const now = new Date('2026-11-15T10:00:00Z');

      const alert = evaluateReapplicationAlert(
        { recipeDate: baseDate, reapplicationDate: targetDate },
        now,
        3,
      );

      expect(alert).toBeNull();
    });
  });
});
