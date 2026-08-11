import { CompanyRepositoryPort } from '../company.ports';

export class FindAllCompaniesUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  execute() {
    return this.repository.findAll();
  }
}
