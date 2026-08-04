import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateWeightRecordData,
  UpdateWeightRecordData,
  WEIGHT_RECORD_REPOSITORY,
  WeightRecordRepositoryPort,
} from './ports/weight-record.repository';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../user/ports/user.repository';
import {
  LIVESTOCK_REPOSITORY,
  LivestockRepositoryPort,
} from '../livestock/ports/livestock.repository';

@Injectable()
export class WeightRecordService {
  constructor(
    @Inject(WEIGHT_RECORD_REPOSITORY)
    private readonly weightRecordRepository: WeightRecordRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(LIVESTOCK_REPOSITORY)
    private readonly livestockRepository: LivestockRepositoryPort,
  ) {}

  // Sin try/catch: comportamiento legacy byte-idéntico (líneas 8-14) — los
  // rechazos del puerto se propagan crudos y findOne devuelve null si no existe.
  async findAll() {
    return await this.weightRecordRepository.findAll();
  }

  async findOne(id: string) {
    return await this.weightRecordRepository.findById(id);
  }

  async delete(id: string) {
    try {
      const existingRecord = await this.weightRecordRepository.findById(id);
      if (!existingRecord) {
        throw new NotFoundException(`Weight record with id ${id} not found`);
      }
      await this.weightRecordRepository.delete(id);
      return { message: `Weight record with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error deleting weight record:', error);
      throw new InternalServerErrorException('Error deleting weight record');
    }
  }

  async update(
    id: string,
    data?: { operatorId?: string; weight?: number; measuredAt?: string },
  ) {
    try {
      if (!data) {
        throw new BadRequestException('No data provided for update');
      }

      const existingRecord = await this.weightRecordRepository.findById(id);

      if (!existingRecord) {
        throw new NotFoundException(`Weight record with id ${id} not found`);
      }

      if (data.operatorId !== undefined) {
        const operator = await this.userRepository.findById(data.operatorId);

        if (!operator) {
          throw new NotFoundException(
            `Operator with id ${data.operatorId} not found`,
          );
        }
      }

      let measuredAt: Date | undefined;

      if (data.measuredAt !== undefined) {
        measuredAt = new Date(data.measuredAt);

        if (Number.isNaN(measuredAt.getTime())) {
          throw new BadRequestException('measuredAt must be a valid date');
        }
      }

      const updateData: UpdateWeightRecordData = {
        ...(data.operatorId !== undefined
          ? { operatorId: data.operatorId }
          : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(measuredAt !== undefined ? { measuredAt } : {}),
      };

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      return await this.weightRecordRepository.update(id, updateData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error updating weight record:', error);
      throw new InternalServerErrorException('Error updating weight record');
    }
  }

  async create(data: {
    livestockId: string;
    operatorId: string;
    weight: number;
    measuredAt: string;
  }) {
    try {
      const operator = await this.userRepository.findById(data.operatorId);
      const livestock = await this.livestockRepository.findById(
        data.livestockId,
      );

      if (!operator) {
        throw new NotFoundException(
          `Operator with id ${data.operatorId} not found`,
        );
      }

      if (!livestock) {
        throw new NotFoundException(
          `Livestock with id ${data.livestockId} not found`,
        );
      }

      const measuredAt = new Date(data.measuredAt);

      if (Number.isNaN(measuredAt.getTime())) {
        throw new BadRequestException('measuredAt must be a valid date');
      }

      const createData: CreateWeightRecordData = {
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        weight: data.weight,
        measuredAt,
      };

      return await this.weightRecordRepository.create(createData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error creating weight record:', error);
      throw new InternalServerErrorException('Error creating weight record');
    }
  }
}
