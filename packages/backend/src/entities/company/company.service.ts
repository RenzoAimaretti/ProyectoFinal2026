import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyEntity,
  CompanyRepositoryPort,
  CompanyWithModules,
  CreateCompanyData,
  UpdateCompanyData,
} from './ports/company.repository';
import {
  MODULE_ENTITY_REPOSITORY,
  ModuleEntityRepositoryPort,
} from '../module-entity/ports/module-entity.repository';

// Service refactorizado a puertos (T-F2-09): conserva EXACTAMENTE el contrato
// observable de antes (400/404/409 y mensajes byte-idénticos, REQ-C-01/03).
// La lectura cruzada de Module se resuelve vía el puerto exportado por
// module-entity (MODULE_ENTITY_REPOSITORY) — REQ-F2-03 / D1.
@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
    @Inject(MODULE_ENTITY_REPOSITORY)
    private readonly moduleRepository: ModuleEntityRepositoryPort,
  ) {}

  async findAll(): Promise<CompanyEntity[]> {
    try {
      return this.repository.findAll();
    } catch {
      throw new BadRequestException('Error fetching all companies');
    }
  }

  async findOne(id: string): Promise<CompanyWithModules | null> {
    try {
      return this.repository.findByIdWithModules(id);
    } catch {
      throw new BadRequestException('Error fetching company by ID');
    }
  }

  async findByCuit(cuit: string): Promise<CompanyWithModules | null> {
    try {
      return this.repository.findByCuit(cuit);
    } catch {
      throw new BadRequestException('Error fetching company by CUIT');
    }
  }

  async create(data: CreateCompanyData): Promise<CompanyEntity> {
    if (!data.name || !data.cuit) {
      throw new BadRequestException('Missing required fields: name and cuit');
    }

    const existingCompany = await this.findByCuit(data.cuit);

    if (existingCompany) {
      throw new ConflictException('Company with this CUIT already exists');
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyEntity> {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const company = await this.repository.findById(id);

    if (!company) {
      throw new NotFoundException(`Company with id ${id} not found`);
    }

    return this.repository.update(id, data);
  }

  async addModule(companyId: string, moduleId: string) {
    try {
      const company = await this.repository.findByIdWithModules(companyId);
      const existingModule = await this.moduleRepository.findById(moduleId);
      if (!company || !existingModule) {
        throw new NotFoundException('Company or module not found');
      } else if (company.modules.some((m) => m.id === moduleId)) {
        throw new ConflictException('Module already added to company');
      }
      await this.repository.assignModule(companyId, moduleId);
      return {
        message: `${existingModule.name} added successfully to company: ${company.name}`,
      };
    } catch {
      throw new BadRequestException('Error adding module to company');
    }
  }
}
