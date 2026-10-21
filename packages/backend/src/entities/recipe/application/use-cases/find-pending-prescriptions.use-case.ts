import { PendingPrescriptionReaderPort } from '../recipe.ports';
import { PendingPrescriptionTask } from '../recipe.types';
import { assertRequiredString } from '../recipe.validation';

/**
 * Builds the agronomist inbox: the tasks of the caller tenant whose
 * `prescriptionStatus` is `SIN_RECETA`. Read-only, so it has no side effect;
 * the tenant scope is applied by the adapter through
 * `task -> lot -> farm -> client`.
 */
export class FindPendingPrescriptionsUseCase {
  constructor(private readonly reader: PendingPrescriptionReaderPort) {}

  async execute(tenantId: string): Promise<PendingPrescriptionTask[]> {
    const tenant = assertRequiredString(tenantId, 'tenantId');

    return this.reader.findPendingByTenant(tenant);
  }
}
