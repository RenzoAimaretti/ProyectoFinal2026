import { DuplicateEntityError } from '../../domain/errors';
import { CompanyRepositoryPort } from '../company.ports';
import { CreateCompanyInput, CompanyRecord } from '../company.types';
import { assertRequiredString } from '../company.validation';

export class CreateCompanyUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  async execute(data: CreateCompanyInput): Promise<CompanyRecord> {
    const name = assertRequiredString(data.name, 'name');
    const cuit = assertRequiredString(data.cuit, 'cuit');

    const existing = await this.repository.findByCuit(cuit);
    if (existing) {
      throw new DuplicateEntityError('Company with this CUIT already exists');
    }

    return this.repository.create({ name, cuit });
  }
}
