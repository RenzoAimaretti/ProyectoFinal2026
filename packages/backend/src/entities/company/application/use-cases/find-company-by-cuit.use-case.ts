import { CompanyRepositoryPort } from '../company.ports';

export class FindCompanyByCuitUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  execute(cuit: string) {
    return this.repository.findByCuit(cuit);
  }
}
