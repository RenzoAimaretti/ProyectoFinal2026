import { ReceptionRepositoryPort } from '../reception.ports';
import { ReceptionRecord } from '../reception.types';
import { assertRequiredString } from '../reception.validation';

/**
 * Tenant-wide read for administrators: every reception whose client belongs to
 * the tenant, regardless of the concrete client.
 */
export class FindReceptionsByTenantUseCase {
  constructor(private readonly repository: ReceptionRepositoryPort) {}

  async execute(tenantId: string): Promise<ReceptionRecord[]> {
    const tenant = assertRequiredString(tenantId, 'tenantId');

    return this.repository.findAllByTenant(tenant);
  }
}
