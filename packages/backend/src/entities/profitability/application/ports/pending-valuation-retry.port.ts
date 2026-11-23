export const PENDING_VALUATION_RETRY = Symbol(
  'PROFITABILITY_PENDING_VALUATION_RETRY',
);

/**
 * Capability: value the approved reports of a company that were left unvalued.
 * Best effort: implementations must not throw.
 */
export interface PendingValuationRetryPort {
  retry(companyId: string): Promise<void>;
}
