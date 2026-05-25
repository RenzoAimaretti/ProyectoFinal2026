import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LotService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.lot.findMany();
    } catch (error) {
      console.error('Error fetching lots:', error);
      throw new InternalServerErrorException('Error fetching lots');
    }
  }

  async findOne(id: string) {
    try {
      const lot = await this.prisma.lot.findUnique({ where: { id } });

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

  async create(data: {name: string; farmId: string; coords: string; area: number; }) {
    if (!data.name || !data.farmId || !data.coords || !data.area || data.area <= 0) {
      throw new BadRequestException('Missing required fields: name, farmId, coords, and area');
    }

    try {
      const farm = await this.prisma.farm.findUnique({ where: { id: data.farmId } });

      if (!farm) {
        throw new NotFoundException('Farm with this ID does not exist');
      }

      return await this.prisma.lot.create({
        data: {
          name: data.name,
          farmId: data.farmId,
          coords: data.coords,
          area: data.area,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      console.error('Error creating lot:', error);
      throw new InternalServerErrorException('Error creating lot');
    }
  }

  async update(id: string, data: {name?: string; farmId?: string; coords?: string; area?: number; active?: boolean; }) {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    try {
      const lot = await this.prisma.lot.findUnique({ where: { id } });

      if (!lot) {
        throw new NotFoundException(`Lot with id ${id} not found`);
      }

      if (data.farmId) {
        const farm = await this.prisma.farm.findUnique({ where: { id: data.farmId } });

        if (!farm) {
          throw new NotFoundException('Farm with this ID does not exist');
        }
      }

      if (data.area !== undefined && data.area <= 0) {
        throw new BadRequestException('Area must be a positive number');
      }

      return await this.prisma.lot.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      console.error('Error updating lot:', error);
      throw new InternalServerErrorException('Error updating lot');
    }
  }
}
