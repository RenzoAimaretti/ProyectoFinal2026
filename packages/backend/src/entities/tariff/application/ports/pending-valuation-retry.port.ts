export const PENDING_VALUATION_RETRY = Symbol('TARIFF_PENDING_VALUATION_RETRY');

export interface PendingValuationRetryInput {
  companyId: string;
  laborTypeId: string;
}

/**
 * Capability: value the approved reports of a company and labor that were left
 * unvalued (they had no tariff). Best effort: implementations must not throw.
 */
export interface PendingValuationRetryPort {
  retry(input: PendingValuationRetryInput): Promise<void>;
}
