import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateFarmData,
  FarmEntity,
  FarmRepositoryPort,
  FARM_REPOSITORY,
  UpdateFarmData,
} from './ports/farm.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepositoryPort,
} from '../company/ports/company.repository';

// Service refactorizado a puertos (T-F2-15): conserva EXACTAMENTE el contrato
// observable de antes (400/404 y mensajes byte-idénticos, REQ-C-01/03). A
// diferencia de company (wave 1), aquí los `await` dentro del try/catch se
// MANTIENEN: el comportamiento actual envuelve los rechazos del puerto en 500
// ('Error fetching/creating/updating farm'). Las lecturas cruzadas del create
// (empresa + duplicado) corren FUERA del try/catch, como en el código original:
// sus rechazos propagan crudo. La lectura cruzada de empresa se resuelve vía el
// puerto exportado por company (COMPANY_REPOSITORY) — REQ-F2-03 / D1.
@Injectable()
export class FarmService {
  constructor(
    @Inject(FARM_REPOSITORY)
    private readonly farmRepository: FarmRepositoryPort,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
  ) {}

  async findAll(): Promise<FarmEntity[]> {
    try {
      return await this.farmRepository.findAll();
    } catch (error) {
      console.error('Error fetching farms:', error);
      throw new InternalServerErrorException('Error fetching farms');
    }
  }

  async findOne(id: string): Promise<FarmEntity> {
    try {
      const farm = await this.farmRepository.findById(id);

      if (!farm) {
        throw new NotFoundException(`Farm with id ${id} not found`);
      }

      return farm;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching farm:', error);
      throw new InternalServerErrorException('Error fetching farm');
    }
  }

  async create(data: CreateFarmData): Promise<FarmEntity> {
    if (
      !data.name ||
      !data.location ||
      !data.companyId ||
      !data.surface ||
      data.surface <= 0
    ) {
      throw new BadRequestException(
        'Missing required fields: name, location, companyId and surface',
      );
    }

    const company = await this.companyRepository.findById(data.companyId);
    const existingFarm = await this.farmRepository.findByNameAndCompany(
      data.name,
      data.companyId,
    );

    if (existingFarm) {
      throw new BadRequestException(
        'A farm with this name already exists for the specified company',
      );
    }
    if (!company) {
      throw new NotFoundException('Company with this ID does not exist');
    }

    try {
      return await this.farmRepository.create(data);
    } catch (error) {
      console.error('Error creating farm:', error);
      throw new InternalServerErrorException('Error creating farm');
    }
  }

  async update(id: string, data: UpdateFarmData): Promise<FarmEntity> {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    try {
      const farm = await this.farmRepository.findById(id);

      if (!farm) {
        throw new NotFoundException(`Farm with id ${id} not found`);
      }

      if (data.companyId) {
        const company = await this.companyRepository.findById(data.companyId);
        if (!company) {
          throw new NotFoundException('Company with this ID does not exist');
        }
      }

      if (data.surface !== undefined && data.surface <= 0) {
        throw new BadRequestException('Surface must be a positive number');
      }

      try {
        return await this.farmRepository.update(id, data);
      } catch (error) {
        console.error('Error updating farm:', error);
        throw new InternalServerErrorException('Error updating farm');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error in update flow:', error);
      throw new InternalServerErrorException('Error updating farm');
    }
  }
}
