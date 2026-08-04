import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateLotData,
  LotEntity,
  LotRepositoryPort,
  LOT_REPOSITORY,
  UpdateLotData,
} from './ports/lot.repository';
import {
  FARM_REPOSITORY,
  FarmRepositoryPort,
} from '../farm/ports/farm.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepositoryPort,
} from '../company/ports/company.repository';
import {
  LIVESTOCK_REPOSITORY,
  LivestockRepositoryPort,
} from '../livestock/ports/livestock.repository';

// Service refactorizado a puertos (T-F2-20): conserva EXACTAMENTE el contrato
// observable de antes (400/404 y mensajes byte-idénticos, REQ-C-01/03).
// A diferencia de farm (T-F2-15), aquí TODAS las lecturas cruzadas corren
// DENTRO del try/catch, como en el código original: sus rechazos se envuelven
// en 500. Solo los throw síncronos (NotFoundException/BadRequestException) se
// re-lanzan crudos. addLiveStock compone las dos escrituras: el lado livestock
// vía LIVESTOCK_REPOSITORY.update (puerto de F1, dueño: livestock) y el lado
// lot vía LOT_REPOSITORY.assignStock (opción 2 de T-F2-18). La lista de farms
// de la empresa sale de FARM_REPOSITORY.findByCompany (reemplaza el include
// farms del prisma actual). REQ-F2-03 / D1: cross-reads vía puertos exportados
// por sus dueños.
@Injectable()
export class LotService {
  constructor(
    @Inject(LOT_REPOSITORY)
    private readonly lotRepository: LotRepositoryPort,
    @Inject(FARM_REPOSITORY)
    private readonly farmRepository: FarmRepositoryPort,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepositoryPort,
    @Inject(LIVESTOCK_REPOSITORY)
    private readonly livestockRepository: LivestockRepositoryPort,
  ) {}

  async findAll(): Promise<LotEntity[]> {
    try {
      return await this.lotRepository.findAll();
    } catch (error) {
      console.error('Error fetching lots:', error);
      throw new InternalServerErrorException('Error fetching lots');
    }
  }

  async findOne(id: string): Promise<LotEntity> {
    try {
      const lot = await this.lotRepository.findById(id);

      if (!lot) {
        throw new NotFoundException(`Lot with id ${id} not found`);
      }

      return lot;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching lot:', error);
      throw new InternalServerErrorException('Error fetching lot');
    }
  }

  async create(data: CreateLotData): Promise<LotEntity> {
    if (
      !data.name ||
      !data.farmId ||
      !data.coords ||
      !data.area ||
      data.area <= 0
    ) {
      throw new BadRequestException(
        'Missing required fields: name, farmId, coords, and area',
      );
    }

    try {
      const farm = await this.farmRepository.findById(data.farmId);
      const existingLot = await this.lotRepository.findByNameAndFarm(
        data.name,
        data.farmId,
      );

      if (!farm || existingLot) {
        throw new NotFoundException(
          'Farm with this ID does not exist or lot with this name already exists in the farm',
        );
      }

      return await this.lotRepository.create(data);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error creating lot:', error);
      throw new InternalServerErrorException('Error creating lot');
    }
  }

  async update(id: string, data: UpdateLotData): Promise<LotEntity> {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    try {
      const lot = await this.lotRepository.findById(id);

      if (!lot) {
        throw new NotFoundException(`Lot with id ${id} not found`);
      }

      if (data.farmId) {
        const farm = await this.farmRepository.findById(data.farmId);

        if (!farm) {
          throw new NotFoundException('Farm with this ID does not exist');
        }
      }

      if (data.area !== undefined && data.area <= 0) {
        throw new BadRequestException('Area must be a positive number');
      }

      return await this.lotRepository.update(id, data);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error updating lot:', error);
      throw new InternalServerErrorException('Error updating lot');
    }
  }

  async addLiveStock(lotId: string, stockId: string): Promise<void> {
    try {
      const lot = await this.lotRepository.findById(lotId);
      const livestock = await this.livestockRepository.findById(stockId);

      if (!lot || !livestock) {
        throw new NotFoundException('Lot or livestock not found');
      }

      const company = await this.companyRepository.findById(
        livestock.companyId,
      );

      if (!company) {
        throw new NotFoundException(
          `Company with id ${livestock.companyId} not found`,
        );
      }

      const farms = await this.farmRepository.findByCompany(
        livestock.companyId,
      );
      const farmBelongsToCompany = farms.some((farm) => farm.id === lot.farmId);

      if (!farmBelongsToCompany) {
        throw new BadRequestException(
          'Lot farm does not belong to livestock company',
        );
      }

      await this.livestockRepository.update(stockId, { lotId });
      await this.lotRepository.assignStock(lotId, stockId);

      // faltaria la logica para validar el usuario que lleva a cabo el
      // movimiento y crear el registro de movimiento correspondiente.
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error adding livestock to lot:', error);
      throw new InternalServerErrorException('Error adding livestock to lot');
    }
  }
}
