import { CompanyRepositoryPort } from '../company.ports';

export class FindCompanyUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  execute(id: string) {
    return this.repository.findById(id);
  }
}
