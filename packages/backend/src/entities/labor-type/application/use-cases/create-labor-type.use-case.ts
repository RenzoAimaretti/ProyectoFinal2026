import { DuplicateEntityError } from '../../domain/errors';
import { LaborTypeRepositoryPort } from '../labor-type.ports';
import { CreateLaborTypeInput, LaborTypeRecord } from '../labor-type.types';
import { assertRequiredString, normalizeOptionalString } from '../labor-type.validation';

export class CreateLaborTypeUseCase {
  constructor(private readonly repository: LaborTypeRepositoryPort) {}

  async execute(tenantId: string, input: CreateLaborTypeInput): Promise<LaborTypeRecord> {
    const validatedTenantId = assertRequiredString(tenantId, 'companyId');
    const name = assertRequiredString(input?.name, 'name');
    const description = normalizeOptionalString(input?.description, 'description');

    const existing = await this.repository.findByNameAndTenantId(name, validatedTenantId);
    if (existing) {
      throw new DuplicateEntityError(
        `Labor type with name ${name} already exists for company ${validatedTenantId}`,
      );
    }

    return this.repository.create({ tenantId: validatedTenantId, name, description });
  }
}
