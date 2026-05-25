import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Farm } from '../../../prisma/generated/client';

@Injectable()
export class FarmService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Farm[]> {
    try {
      return await this.prisma.farm.findMany();
    } catch (error) {
      console.error('Error fetching farms:', error);
      throw new InternalServerErrorException('Error fetching farms');
    }
  }

  async findOne(id: string): Promise<Farm> {
    try {
      const farm = await this.prisma.farm.findUnique({ where: { id } });

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

  async create(data: {name: string; location: string; companyId: string; surface: number;}): Promise<Farm> {
    if (!data.name || !data.location || !data.companyId || !data.surface || data.surface <= 0) {
      throw new BadRequestException('Missing required fields: name, location, companyId and surface');
    }

    const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
    const existingFarm = await this.prisma.farm.findFirst({ where: { name: data.name, companyId: data.companyId } });

    if (existingFarm) {
      throw new BadRequestException('A farm with this name already exists for the specified company');
    }
    if (!company) {
      throw new NotFoundException('Company with this ID does not exist');
    }

    try {
      return await this.prisma.farm.create({ data });
    } catch (error) {
      console.error('Error creating farm:', error);
      throw new InternalServerErrorException('Error creating farm');
    }
  }

  async update(id: string, data: {name?: string; location?: string; companyId?: string; surface?: number;}): Promise<Farm> {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    try {
      const farm = await this.prisma.farm.findUnique({ where: { id } });

      if (!farm) {
        throw new NotFoundException(`Farm with id ${id} not found`);
      }

      if (data.companyId) {
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) {
          throw new NotFoundException('Company with this ID does not exist');
        }
      }

      if (data.surface !== undefined && data.surface <= 0) {
        throw new BadRequestException('Surface must be a positive number');
      }

      try {
        return await this.prisma.farm.update({ where: { id }, data });
      } catch (error) {
        console.error('Error updating farm:', error);
        throw new InternalServerErrorException('Error updating farm');
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      console.error('Error in update flow:', error);
      throw new InternalServerErrorException('Error updating farm');
    }
  }
}
