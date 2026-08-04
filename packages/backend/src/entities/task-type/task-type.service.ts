import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  TASK_TYPE_REPOSITORY,
  TaskTypeRepositoryPort,
} from './ports/task-type.repository';
import {
  TASK_REPOSITORY,
  TaskRepositoryPort,
} from '../task/ports/task.repository';

@Injectable()
export class TaskTypeService {
  constructor(
    @Inject(TASK_TYPE_REPOSITORY)
    private readonly taskTypeRepository: TaskTypeRepositoryPort,
    // T-F2-46/49 (D1): el cross-read de taskIds usa TASK_REPOSITORY exportado
    // por task (T-F2-45) — mitad del ciclo que se resuelve en la wave (T-F2-51).
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,
  ) {}

  // Nota: `await` + BadRequestException — el legacy devolvía findMany sin await
  // (rechazo crudo) pero el catch lanzaba BadRequestException('Error fetching
  // task types'); el refactor hace el wrap efectivo con el MISMO mensaje/tipo.
  async findAll() {
    try {
      return await this.taskTypeRepository.findAll();
    } catch {
      throw new BadRequestException('Error fetching task types');
    }
  }

  // findOne legacy NO lanza 404: devolvía la promesa de findUnique (null si no
  // existe). Se preserva: null cuando el task type no existe.
  async findOne(id: string) {
    try {
      return await this.taskTypeRepository.findById(id);
    } catch {
      throw new BadRequestException('Error fetching task type by ID');
    }
  }

  async create(data: { name: string; description?: string }) {
    try {
      if (!data || !data.name) {
        throw new BadRequestException('Missing required field: name');
      }

      // optional: prevent duplicate names
      const existing = await this.taskTypeRepository.findByName(data.name);
      if (existing) {
        throw new ConflictException('Task type with this name already exists');
      }

      return await this.taskTypeRepository.create(data);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error creating task type');
    }
  }

  async update(
    id: string,
    data: { name?: string; description?: string; taskIds?: string[] },
  ) {
    try {
      if (!data || Object.keys(data).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      const existing = await this.taskTypeRepository.findById(id);
      if (!existing)
        throw new NotFoundException(`Task type with id ${id} not found`);

      if (data.taskIds) {
        // validate task IDs
        const tasks = await this.taskRepository.findByIds(data.taskIds);
        const foundTaskIds = tasks.map((t) => t.id);
        const invalidIds = data.taskIds.filter(
          (taskId) => !foundTaskIds.includes(taskId),
        );
        if (invalidIds.length > 0) {
          throw new NotFoundException(
            `Tasks with ids ${invalidIds.join(', ')} not found`,
          );
        }
      }
      return await this.taskTypeRepository.update(id, {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.taskIds !== undefined ? { taskIds: data.taskIds } : {}),
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating task type');
    }
  }

  async delete(id: string) {
    try {
      const existingTaskType = await this.taskTypeRepository.findById(id);
      if (!existingTaskType) {
        throw new NotFoundException(`Task type with id ${id} not found`);
      }
      await this.taskTypeRepository.delete(id);
      return { message: `Task type with id ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting task type');
    }
  }
}
