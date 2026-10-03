import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { CompanyRepositoryPort } from '../company.ports';
import { CompanyRecord, UpdateCompanyInput } from '../company.types';
import { assertRequiredString } from '../company.validation';

export class UpdateCompanyUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  async execute(
    id: string,
    tenantId: string,
    data?: UpdateCompanyInput,
  ): Promise<CompanyRecord> {
    if (!data || Object.values(data).every((value) => value === undefined)) {
      throw new InvalidInputError('No data provided for update');
    }

    const updateData: UpdateCompanyInput = {};

    if (data.name !== undefined) {
      updateData.name = assertRequiredString(data.name, 'name');
    }

    if (data.cuit !== undefined) {
      updateData.cuit = assertRequiredString(data.cuit, 'cuit');
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    if (Object.keys(updateData).length === 0) {
      throw new InvalidInputError('No data provided for update');
    }

    const company = await this.repository.findByIdForTenant(id, tenantId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${id} not found`);
    }

    return this.repository.updateForTenant(id, tenantId, updateData);
  }
}
