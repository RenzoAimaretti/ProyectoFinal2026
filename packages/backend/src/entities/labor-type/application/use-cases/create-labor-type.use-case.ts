import { DuplicateEntityError } from '../../domain/errors';
import { DEFAULT_LABOR_KIND, assertLaborKind } from '../../domain/labor-kind';
import { LaborTypeRepositoryPort } from '../labor-type.ports';
import { CreateLaborTypeInput, LaborTypeRecord } from '../labor-type.types';
import { assertRequiredString, normalizeOptionalString } from '../labor-type.validation';

export class CreateLaborTypeUseCase {
  constructor(private readonly repository: LaborTypeRepositoryPort) {}

  async execute(tenantId: string, input: CreateLaborTypeInput): Promise<LaborTypeRecord> {
    const validatedTenantId = assertRequiredString(tenantId, 'companyId');
    const name = assertRequiredString(input?.name, 'name');
    const description = normalizeOptionalString(input?.description, 'description');
    const kind =
      input?.kind === undefined
        ? DEFAULT_LABOR_KIND
        : assertLaborKind(input.kind);

    const existing = await this.repository.findByNameAndTenantId(name, validatedTenantId);
    if (existing) {
      throw new DuplicateEntityError(
        `Labor type with name ${name} already exists for company ${validatedTenantId}`,
      );
    }

    return this.repository.create({ tenantId: validatedTenantId, name, description, kind });
  }
}
