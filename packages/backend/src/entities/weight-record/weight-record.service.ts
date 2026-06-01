import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeightRecordService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.weightRecord.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.weightRecord.findUnique({ where: { id } });
  }

  async delete(id: string) {
    try {
      const existingRecord = await this.prisma.weightRecord.findUnique({ where: { id } });
      if (!existingRecord) {
        throw new NotFoundException(`Weight record with id ${id} not found`);
      }
      await this.prisma.weightRecord.delete({ where: { id } });
      return { message: `Weight record with id ${id} deleted successfully` };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error deleting weight record:', error);
      throw new InternalServerErrorException('Error deleting weight record');
    }
  }

  async update(id: string, data?: { operatorId?: string; weight?: number; measuredAt?: string; }) {
    try {
      if (!data) {
        throw new BadRequestException('No data provided for update');
      }

      const existingRecord = await this.prisma.weightRecord.findUnique({ where: { id } });

      if (!existingRecord) {
        throw new NotFoundException(`Weight record with id ${id} not found`);
      }

      if (data.operatorId !== undefined) {
        const operator = await this.prisma.user.findUnique({ where: { id: data.operatorId } });

        if (!operator) {
          throw new NotFoundException(`Operator with id ${data.operatorId} not found`);
        }
      }

    

      let measuredAt: Date | undefined;

      if (data.measuredAt !== undefined) {
        measuredAt = new Date(data.measuredAt);

        if (Number.isNaN(measuredAt.getTime())) {
          throw new BadRequestException('measuredAt must be a valid date');
        }
      }

      const updateData = {
        ...(data.operatorId !== undefined ? { operatorId: data.operatorId } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(measuredAt !== undefined ? { measuredAt } : {}),
      };

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      return await this.prisma.weightRecord.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error updating weight record:', error);
      throw new InternalServerErrorException('Error updating weight record');
    }
  }

  async create(data: {livestockId: string; operatorId: string; weight:number; measuredAt:string;}) {
    try {
      const operator = await this.prisma.user.findUnique({ where: { id: data.operatorId } });
      const livestock = await this.prisma.livestock.findUnique({ where: { id: data.livestockId } });

      if (!operator) {
        throw new NotFoundException(`Operator with id ${data.operatorId} not found`);
      }

      if (!livestock) {
        throw new NotFoundException(`Livestock with id ${data.livestockId} not found`);
      }

      const measuredAt = new Date(data.measuredAt);

      if (Number.isNaN(measuredAt.getTime())) {
        throw new BadRequestException('measuredAt must be a valid date');
      }

      return await this.prisma.weightRecord.create({
        data: {
          livestockId: data.livestockId,
          operatorId: data.operatorId,
          weight: data.weight,
          measuredAt,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error creating weight record:', error);
      throw new InternalServerErrorException('Error creating weight record');
    }
  }
}
