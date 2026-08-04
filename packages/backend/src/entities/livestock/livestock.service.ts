import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { LivestockStatus } from './domain/livestock-status';
import { LIVESTOCK_REPOSITORY, LivestockRepositoryPort } from './ports/livestock.repository';
import { COMPANY_LOOKUP, CompanyLookupPort } from './ports/company-lookup.port';
import { LOT_LOOKUP, LotLookupPort } from './ports/lot-lookup.port';

type CreateLivestockInput = {
  companyId: string;
  lotId?: string | null;
  tagNumber: string;
  breed?: string | null;
  species: string;
  birthDate?: string | Date | null;
  sex: string;
};

type UpdateLivestockInput = {
  companyId?: string;
  lotId?: string | null;
  tagNumber?: string;
  breed?: string | null;
  species?: string;
  birthDate?: string | Date | null;
  sex?: string;
  status?: LivestockStatus;
};

@Injectable()
export class LivestockService {
  constructor(
    @Inject(LIVESTOCK_REPOSITORY) private readonly livestockRepository: LivestockRepositoryPort,
    @Inject(COMPANY_LOOKUP) private readonly companyLookup: CompanyLookupPort,
    @Inject(LOT_LOOKUP) private readonly lotLookup: LotLookupPort,
  ) {}

  async findAll() {
    try {
      return await this.livestockRepository.findAll();
    } catch (error) {
      console.error('Error fetching livestock:', error);
      throw new InternalServerErrorException('Error fetching livestock');
    }
  }

  async findOne(id: string) {
    try {
      const livestock = await this.livestockRepository.findById(id);

      if (!livestock) {
        throw new NotFoundException(`Livestock with id ${id} not found`);
      }

      return livestock;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching livestock:', error);
      throw new InternalServerErrorException('Error fetching livestock');
    }
  }

  async create(data: CreateLivestockInput) {
    this.assertRequiredString(data.companyId, 'companyId');
    this.assertRequiredString(data.tagNumber, 'tagNumber');
    this.assertRequiredString(data.species, 'species');
    this.assertRequiredString(data.sex, 'sex');

    try {
      const companyExists = await this.companyLookup.companyExists(data.companyId);

      if (!companyExists) {
        throw new NotFoundException(`Company with id ${data.companyId} not found`);
      }

      if (data.lotId) {
        const lot = await this.lotLookup.findLotWithFarm(data.lotId);

        if (!lot) {
          throw new NotFoundException(`Lot with id ${data.lotId} not found`);
        }

        if (lot.farm.companyId !== data.companyId) {
          throw new BadRequestException('Lot must belong to the same company as the livestock');
        }
      }

      const existingTagNumber = await this.livestockRepository.findByTagNumber(data.tagNumber);

      if (existingTagNumber) {
        throw new ConflictException('Livestock with this tagNumber already exists');
      }

      const birthDate = this.parseDate(data.birthDate);

      return await this.livestockRepository.create({
        companyId: data.companyId,
        lotId: data.lotId ?? null,
        tagNumber: data.tagNumber,
        breed: data.breed ?? null,
        species: data.species,
        birthDate,
        sex: data.sex,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error creating livestock:', error);
      throw new InternalServerErrorException('Error creating livestock');
    }
  }

  async update(id: string, data: UpdateLivestockInput) {
    if (!data || Object.keys(data).every((key) => data[key as keyof UpdateLivestockInput] === undefined)) {
      throw new BadRequestException('No data provided for update');
    }

    try {
      const livestock = await this.livestockRepository.findByIdWithLotFarm(id);

      if (!livestock) {
        throw new NotFoundException(`Livestock with id ${id} not found`);
      }

      const nextCompanyId = data.companyId ?? livestock.companyId;
      const nextLotId = data.lotId !== undefined ? data.lotId : livestock.lotId;

      if (data.companyId) {
        const companyExists = await this.companyLookup.companyExists(data.companyId);

        if (!companyExists) {
          throw new NotFoundException(`Company with id ${data.companyId} not found`);
        }
      }

      if (data.lotId !== undefined && nextLotId) {
        const lot = await this.lotLookup.findLotWithFarm(nextLotId);

        if (!lot) {
          throw new NotFoundException(`Lot with id ${nextLotId} not found`);
        }

        if (lot.farm.companyId !== nextCompanyId) {
          throw new BadRequestException('Lot must belong to the same company as the livestock');
        }
      }

      if (data.tagNumber !== undefined) {
        this.assertRequiredString(data.tagNumber, 'tagNumber');

        const duplicateTagNumber = await this.livestockRepository.findByTagNumberExcluding(data.tagNumber, id);

        if (duplicateTagNumber) {
          throw new ConflictException('Livestock with this tagNumber already exists');
        }
      }

      if (data.species !== undefined) {
        this.assertRequiredString(data.species, 'species');
      }

      if (data.sex !== undefined) {
        this.assertRequiredString(data.sex, 'sex');
      }

      const birthDate = data.birthDate !== undefined ? this.parseDate(data.birthDate) : undefined;

      return await this.livestockRepository.update(id, {
        ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
        ...(data.lotId !== undefined ? { lotId: data.lotId } : {}),
        ...(data.tagNumber !== undefined ? { tagNumber: data.tagNumber } : {}),
        ...(data.breed !== undefined ? { breed: data.breed } : {}),
        ...(data.species !== undefined ? { species: data.species } : {}),
        ...(birthDate !== undefined ? { birthDate } : {}),
        ...(data.sex !== undefined ? { sex: data.sex } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error updating livestock:', error);
      throw new InternalServerErrorException('Error updating livestock');
    }
  }

  async remove(id: string) {
    try {
      const livestock = await this.livestockRepository.findById(id);

      if (!livestock) {
        throw new NotFoundException(`Livestock with id ${id} not found`);
      }

      await this.livestockRepository.delete(id);

      return { message: `Livestock with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      console.error('Error deleting livestock:', error);
      throw new InternalServerErrorException('Error deleting livestock');
    }
  }

  private assertRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  private parseDate(value: string | Date | null | undefined) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('birthDate must be a valid date');
    }

    return date;
  }
}
