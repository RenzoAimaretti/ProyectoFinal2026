import {
  DAILY_REPORT_INITIAL_STATUS,
  DailyReportStatus,
} from './daily-report-status';
import { InvalidInputError, InvalidStateTransitionError } from './errors';

/**
 * Hectares and hours are mandatory work amounts of a daily report journey and
 * must be strictly positive.
 */
export function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a number greater than 0`);
  }

  return value;
}

/**
 * A daily report consumed each input at most once; repeated inputs would
 * double count the consumption of the same supply.
 */
export function assertDistinctItemInputs(
  items: readonly { inputId: string }[],
): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.inputId)) {
      throw new InvalidInputError(
        `Daily report items must not repeat the input ${item.inputId}`,
      );
    }

    seen.add(item.inputId);
  }
}

/**
 * Approval is a terminal decision over a pending report, and the only one that
 * deducts stock.
 */
export function assertPendingApproval(status: DailyReportStatus): void {
  if (status !== DAILY_REPORT_INITIAL_STATUS) {
    throw new InvalidStateTransitionError(
      `A daily report in status ${status} cannot be approved`,
    );
  }
}

/**
 * A rejection without a reason cannot be audited, so it is refused. The blank
 * check runs before any port is touched, keeping the decision explainable.
 */
export function assertRejectionReason(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError('rejectionReason is required');
  }

  return value.trim();
}
