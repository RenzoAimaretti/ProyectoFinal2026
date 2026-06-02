import { BadRequestException, Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    try {
      return this.prisma.task.findMany();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching tasks');
    }
  }

  async findOne(id: string) {
    try {
      const existingTask = await this.prisma.task.findUnique({ where: { id } });
      if (!existingTask) throw new NotFoundException(`Task with id ${id} not found`);
      return existingTask;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching task');
    }
  }

  create(data: {}) {
  }

  async update(id: string, data: {}) {
   
  }

  async delete(id: string) {
    try {
      const existingTask = await this.prisma.task.findUnique({ where: { id } });
      if (!existingTask) throw new NotFoundException(`Task with id ${id} not found`);
      await this.prisma.task.delete({ where: { id } });
      return { message: `Task with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting task');
    }
  }
}

