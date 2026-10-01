import { EntityNotFoundError } from '../../domain/errors';
import { ReceptionRepositoryPort } from '../reception.ports';
import { ReceptionRecord } from '../reception.types';
import { assertRequiredString } from '../reception.validation';

/**
 * Tenant-wide single read. It is the entry point to resolve the client scope of
 * an administrator decision before the client-scoped operation runs.
 */
export class FindReceptionByTenantUseCase {
  constructor(private readonly repository: ReceptionRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<ReceptionRecord> {
    const receptionId = assertRequiredString(id, 'id');
    const tenant = assertRequiredString(tenantId, 'tenantId');

    const reception = await this.repository.findByIdForTenant(
      receptionId,
      tenant,
    );

    if (!reception) {
      throw new EntityNotFoundError(
        `Reception with id ${receptionId} not found`,
      );
    }

    return reception;
  }
}
