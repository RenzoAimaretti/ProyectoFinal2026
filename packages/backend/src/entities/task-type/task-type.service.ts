import { BadRequestException, Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskTypeService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    try {
      return this.prisma.taskType.findMany();
    } catch (error) {
      throw new BadRequestException('Error fetching task types');
    }
  }

  findOne(id: string) {
    try {
      const taskType = this.prisma.taskType.findUnique({ where: { id } });
      if (!taskType) {
        // Note: prisma returns null for not found; check after resolving
      }
      return taskType;
    } catch (error) {
      throw new BadRequestException('Error fetching task type by ID');
    }
  }

  async create(data: {name: string;description?: string;}) {
    try {
      if (!data || !data.name) {
        throw new BadRequestException('Missing required field: name');
      }

      // optional: prevent duplicate names
      const existing = await this.prisma.taskType.findFirst({ where: { name: data.name } });
      if (existing) {
        throw new ConflictException('Task type with this name already exists');
      }

      return await this.prisma.taskType.create({ data });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error creating task type');
    }
  }

  async update(id: string, data: {name?: string;description?: string; taskIds?: string[]}) {
    try {
      if (!data || Object.keys(data).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      const existing = await this.prisma.taskType.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Task type with id ${id} not found`);

      if(data.taskIds) {
        // validate task IDs
        const tasks = await this.prisma.task.findMany({ where: { id: { in: data.taskIds } } });
        const foundTaskIds = tasks.map(t => t.id);
        const invalidIds = data.taskIds.filter(id => !foundTaskIds.includes(id));
        if (invalidIds.length > 0) {
          throw new NotFoundException(`Tasks with ids ${invalidIds.join(', ')} not found`);
        }
      }
      return await this.prisma.taskType.update({ where: { id }, data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.taskIds !== undefined ? { tasks: { set: data.taskIds.map(id => ({ id })) } } : {}),
      } });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating task type');
    }
  }

  async delete(id: string) {
    try {
      const existingTaskType = await this.prisma.taskType.findUnique({ where: { id } });
      if (!existingTaskType) {
        throw new NotFoundException(`Task type with id ${id} not found`);
      }
      await this.prisma.taskType.delete({ where: { id } });
      return { message: `Task type with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting task type');
    }
    
  }
}
