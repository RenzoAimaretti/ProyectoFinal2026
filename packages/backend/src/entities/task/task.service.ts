import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from './domain/task-status';
import { UserRole } from '../user/domain/user-role';
import {
  TASK_REPOSITORY,
  TASK_TYPE_LOOKUP,
  TaskRepositoryPort,
  TaskTypeLookupPort,
} from './ports/task.repository';
import { LOT_REPOSITORY, LotRepositoryPort } from '../lot/ports/lot.repository';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../user/ports/user.repository';

@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,
    // D1: capability port estrecho — task-type aún no está extraído (T-F2-46..50).
    // El legacy hacía taskType.findUnique SIN await (líneas 33-40: el check era
    // un no-op — una promesa es siempre truthy). El refactor lo hace EFECTIVO:
    // divergencia consciente pedida por T-F2-41 (REQ-F2-03).
    @Inject(TASK_TYPE_LOOKUP)
    private readonly taskTypeLookup: TaskTypeLookupPort,
    @Inject(LOT_REPOSITORY)
    private readonly lotRepository: LotRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  // Nota: `await` deliberado — el legacy devolvía la promesa sin await y el
  // rechazo del puerto se propagaba crudo. El spec (T-F2-41) congela el wrap en
  // 500 'Error fetching tasks' (intención del catch legacy).
  async findAll() {
    try {
      return await this.taskRepository.findAll();
    } catch {
      throw new InternalServerErrorException('Error fetching tasks');
    }
  }

  async findOne(id: string) {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask)
        throw new NotFoundException(`Task with id ${id} not found`);
      return existingTask;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching task');
    }
  }
  // La task queda asociada a la compania a través del lote, no es necesario validar la compañía aquí
  async create(data: { lotId: string; taskTypeId: string; startedAt: string }) {
    try {
      if (!data || !data.lotId || !data.taskTypeId || !data.startedAt) {
        throw new BadRequestException(
          'Missing required fields: lotId, taskTypeId, startedAt',
        );
      }
      const taskType = await this.taskTypeLookup.findById(data.taskTypeId);
      if (!taskType) {
        throw new BadRequestException(
          `Task type with id ${data.taskTypeId} does not exist`,
        );
      }
      const lot = await this.lotRepository.findById(data.lotId);
      if (!lot) {
        throw new BadRequestException(
          `Lot with id ${data.lotId} does not exist`,
        );
      }

      if (data.startedAt !== undefined) {
        const startedAt = new Date(data.startedAt);
        if (isNaN(startedAt.getTime())) {
          throw new BadRequestException('Invalid date format for startedAt');
        }
      }
      const createData = {
        lotId: data.lotId,
        taskTypeId: data.taskTypeId,
        startedAt: new Date(data.startedAt),
      };
      return await this.taskRepository.create(createData);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error creating task');
    }
  }

  async update(
    id: string,
    data: { status?: TaskStatus; startedAt?: string; finishedAt?: string },
  ) {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${id} not found`);
      }
      if (
        data.status !== undefined &&
        !Object.values(TaskStatus).includes(data.status)
      ) {
        throw new BadRequestException(
          `Invalid status value. Allowed values are: ${Object.values(TaskStatus).join(', ')}`,
        );
      }
      let startedAt: Date | undefined;
      if (data.startedAt !== undefined) {
        startedAt = new Date(data.startedAt);
        if (Number.isNaN(startedAt.getTime())) {
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
        ...(data.startedAt !== undefined ? { startedAt } : {}),
        ...(data.finishedAt !== undefined ? { finishedAt } : {}),
      };
      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }
      return await this.taskRepository.update(id, updateData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating task');
    }
  }

  async addOperario(taskId: string, operatorId: string) {
    try {
      const existingTask =
        await this.taskRepository.findByIdWithOperators(taskId);
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }
      const operator = await this.userRepository.findById(operatorId);
      if (!operator || operator.role !== UserRole.OPERARIO) {
        throw new NotFoundException(`Operator with id ${operatorId} not found`);
      }
      if (existingTask.operators.some((op) => op.id === operatorId)) {
        throw new ConflictException(
          `Operator with id ${operatorId} is already assigned to task with id ${taskId}`,
        );
      } else {
        await this.taskRepository.addOperator(taskId, operatorId);
        return {
          message: `Operator with id ${operatorId} added to task with id ${taskId} successfully`,
        };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error adding operator to task');
    }
  }

  async removeOperario(taskId: string, operatorId: string) {
    try {
      const existingTask =
        await this.taskRepository.findByIdWithOperators(taskId);
      if (!existingTask) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }
      if (!existingTask.operators.some((op) => op.id === operatorId)) {
        throw new NotFoundException(
          `Operator with id ${operatorId} is not assigned to task with id ${taskId}`,
        );
      }
      await this.taskRepository.removeOperator(taskId, operatorId);
      return {
        message: `Operator with id ${operatorId} removed from task with id ${taskId} successfully`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error removing operator from task',
      );
    }
  }

  async delete(id: string) {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask)
        throw new NotFoundException(`Task with id ${id} not found`);
      await this.taskRepository.delete(id);
      return { message: `Task with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting task');
    }
  }
}
