import { EntityNotFoundError } from '../../domain/errors';
import { CompanyRepositoryPort } from '../company.ports';
import { CompanyWithModules } from '../company.types';

export class FindCompanyUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<CompanyWithModules> {
    const company = await this.repository.findByIdForTenant(id, tenantId);

    if (!company) {
      throw new EntityNotFoundError(`Company with id ${id} not found`);
    }

    return company;
  }
}
