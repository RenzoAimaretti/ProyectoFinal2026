import { BadRequestException, Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, UserRole } from '../../../prisma/generated/enums';

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
  // La task queda asociada a la compania a través del lote, no es necesario validar la compañía aquí
  create(data: {lotId:string;taskTypeId:string; startedAt:string;}) {
    try{
      if (!data || !data.lotId || !data.taskTypeId || !data.startedAt) {
        throw new BadRequestException('Missing required fields: lotId, taskTypeId, startedAt');
      }
      const taskType = this.prisma.taskType.findUnique({ where: { id: data.taskTypeId } });
      if (!taskType) {
        throw new BadRequestException(`Task type with id ${data.taskTypeId} does not exist`);
      }
      const lot = this.prisma.lot.findUnique({ where: { id: data.lotId } });
      if (!lot) {
        throw new BadRequestException(`Lot with id ${data.lotId} does not exist`);
      }

      if(data.startedAt!==undefined){
        const startedAt = new Date(data.startedAt);
        if (isNaN(startedAt.getTime())) {
          throw new BadRequestException('Invalid date format for startedAt');
        }
      }
      const createData = {
        lotId: data.lotId,
        taskTypeId: data.taskTypeId,
        startedAt: new Date(data.startedAt)
      }
      return this.prisma.task.create({ data: createData });

    }catch(error){
      throw new InternalServerErrorException('Error creating task');
    }
  }

  async update(id: string, data: {status?: TaskStatus; startedAt?: string; finishedAt?: string;}) {
    try {
      const existingTask = await this.prisma.task.findUnique({ where: { id } });
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${id} not found`);
      }
      if(data.status !==undefined && !Object.values(TaskStatus).includes(data.status)){
        throw new BadRequestException(`Invalid status value. Allowed values are: ${Object.values(TaskStatus).join(', ')}`);
      }
      let measuredAt: Date | undefined;
      if (data.startedAt !== undefined) {
        measuredAt = new Date(data.startedAt);
        if (Number.isNaN(measuredAt.getTime())) {
          throw new BadRequestException('startedAt must be a valid date');
        }
      }
      let finishedAt: Date | undefined;
      if (data.finishedAt !== undefined) {
        finishedAt = new Date(data.finishedAt);
        if (Number.isNaN(finishedAt.getTime())) {
          throw new BadRequestException('finishedAt must be a valid date');
        }
      }
      const updateData = {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.startedAt !== undefined ? { startedAt: measuredAt } : {}),
        ...(data.finishedAt !== undefined ? { finishedAt } : {}),
      };
      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }
      return await this.prisma.task.update({
        where: { id },
        data: updateData,
      });
      
    }catch (error) {
      throw new InternalServerErrorException('Error updating task');
  }
}

async addOperario(taskId: string, operatorId: string) {
    try {
      const existingTask = await this.prisma.task.findUnique({ where: { id: taskId }, include:{ operators:{select:{ id: true }}} });
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }
      const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
      if (!operator|| operator.role !== UserRole.OPERARIO) {
        throw new NotFoundException(`Operator with id ${operatorId} not found`);
      }
      if (existingTask.operators.some(op => op.id === operatorId)) {
        throw new ConflictException(`Operator with id ${operatorId} is already assigned to task with id ${taskId}`);
      }else{
        await this.prisma.task.update({
          where: { id: taskId },
          data: { operators: { connect: { id: operatorId } } },
        });
        return { message: `Operator with id ${operatorId} added to task with id ${taskId} successfully` };
      }
      
    }catch(error){
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error adding operator to task');
    }
  }
async removeOperario(taskId: string, operatorId: string) {
    try {
      const existingTask = await this.prisma.task.findUnique({ where: { id: taskId }, include:{ operators:{select:{ id: true }}} });
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }
      if (!existingTask.operators.some(op => op.id === operatorId)) {
        throw new NotFoundException(`Operator with id ${operatorId} is not assigned to task with id ${taskId}`);
      }
      await this.prisma.task.update({
        where: { id: taskId },
        data: { operators: { disconnect: { id: operatorId } } },
      });
      return { message: `Operator with id ${operatorId} removed from task with id ${taskId} successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing operator from task');
    }
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

