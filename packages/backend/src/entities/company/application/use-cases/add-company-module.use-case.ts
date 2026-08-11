import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { CompanyRepositoryPort, ModuleReaderPort } from '../company.ports';

export class AddCompanyModuleUseCase {
  constructor(
    private readonly repository: CompanyRepositoryPort,
    private readonly moduleReader: ModuleReaderPort,
  ) {}

  async execute(
    companyId: string,
    moduleId: string,
  ): Promise<{ message: string }> {
    const company = await this.repository.findById(companyId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${companyId} not found`);
    }

    const module = await this.moduleReader.findById(moduleId);
    if (!module) {
      throw new EntityNotFoundError(`Module with id ${moduleId} not found`);
    }

    if (company.modules.some((item) => item.id === moduleId)) {
      throw new DuplicateEntityError('Module already added to company');
    }

    await this.repository.addModule({ companyId, moduleId });

    return {
      message: `${module.name} added successfully to company: ${company.name}`,
    };
  }
}
