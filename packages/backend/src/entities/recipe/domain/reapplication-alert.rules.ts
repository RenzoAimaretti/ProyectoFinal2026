export type ReapplicationAlertUrgency = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';

export type ReapplicationAlertPlan = {
  recipeDate: Date;
  reapplicationDate?: Date | null;
  reapplicationIntervalDays?: number | null;
};

export type EvaluatedReapplicationAlert = {
  targetDate: Date;
  daysRemaining: number;
  urgency: ReapplicationAlertUrgency;
  isDue: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * R010: Resolves the target date for a re-application / doble golpe.
 * If an explicit date was scheduled, it takes precedence.
 * Otherwise, the interval in days is added to the prescription date.
 * If neither is present, no re-application was planned.
 */
export function calculateReapplicationTargetDate(
  plan: ReapplicationAlertPlan,
): Date | null {
  if (plan.reapplicationDate instanceof Date && !Number.isNaN(plan.reapplicationDate.getTime())) {
    return new Date(plan.reapplicationDate.getTime());
  }

  if (
    typeof plan.reapplicationIntervalDays === 'number' &&
    Number.isInteger(plan.reapplicationIntervalDays) &&
    plan.reapplicationIntervalDays > 0
  ) {
    return new Date(plan.recipeDate.getTime() + plan.reapplicationIntervalDays * MS_PER_DAY);
  }

  return null;
}

/**
 * Calculates calendar day difference between target date and current date (now),
 * ignoring time-of-day offsets.
 */
export function calculateDaysRemaining(targetDate: Date, now: Date): number {
  const targetUtc = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
  );
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.round((targetUtc - nowUtc) / MS_PER_DAY);
}

/**
 * Evaluates whether a re-application plan requires an alert as of `now`.
 * An alert is generated when:
 * - A valid target date exists.
 * - The date is overdue (daysRemaining < 0), due today (daysRemaining === 0),
 *   or upcoming within the alert horizon (default 3 days).
 */
export function evaluateReapplicationAlert(
  plan: ReapplicationAlertPlan,
  now: Date,
  upcomingHorizonDays = 3,
): EvaluatedReapplicationAlert | null {
  const targetDate = calculateReapplicationTargetDate(plan);
  if (!targetDate) {
    return null;
  }

  const daysRemaining = calculateDaysRemaining(targetDate, now);

  if (daysRemaining < 0) {
    return {
      targetDate,
      daysRemaining,
      urgency: 'OVERDUE',
      isDue: true,
    };
  }

  if (daysRemaining === 0) {
    return {
      targetDate,
      daysRemaining,
      urgency: 'DUE_TODAY',
      isDue: true,
    };
  }

  if (daysRemaining <= upcomingHorizonDays) {
    return {
      targetDate,
      daysRemaining,
      urgency: 'UPCOMING',
      isDue: false,
    };
  }

  return null;
}
