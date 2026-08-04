import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateMachineUsageData,
  MachineUsageEntity,
  MachineUsageRepositoryPort,
  MACHINE_USAGE_REPOSITORY,
  UpdateMachineUsageData,
} from './ports/machine-usage.repository';
import {
  MACHINE_REPOSITORY,
  MachineRepositoryPort,
} from '../machine/ports/machine.repository';
import {
  TASK_REPOSITORY,
  TaskRepositoryPort,
} from '../task/ports/task.repository';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../user/ports/user.repository';
import { MachineStatus } from '../machine/domain/machine-status';

// Service refactorizado a puertos (T-F2-61): conserva EXACTAMENTE el contrato
// observable del legacy (mensajes 500 byte-idénticos, REQ-C-01/03). Como en el
// código original, TODAS las validaciones y lecturas cruzadas corren DENTRO del
// try/catch y el catch general REEMPLAZA cualquier error (incluidos los throws
// internos 'Missing required fields...', 'Machine, task, or operator not found',
// 'Operator is not assigned to the task', 'Machine esta en mantenimiento o
// inactiva', 'Machine usage with id X not found') por el mensaje genérico
// 'Error creating/updating machine usage'.
// El orden de las lecturas del create es SECUENCIAL (machine → task → operator),
// como en el legacy: si la primera rechaza, las siguientes NO se ejecutan.
// Lecturas cruzadas vía puertos exportados por los dueños (REQ-F2-03 / D1):
// MACHINE_REPOSITORY (wave 6), TASK_REPOSITORY (wave 5), USER_REPOSITORY (wave 3).
// Divergencia consciente (REQ-A-01, precedente T-F2-41): el legacy escribía
// `intialFuel` (typo, schema.prisma línea 138 tiene `initialFuel`) — el create
// legacy SIEMPRE fallaba con P2009 unknown argument → 500. El refactor usa el
// nombre correcto y el create pasa a ser efectivo. El check de required del
// legacy NO incluía intialFuel (solo machineId/taskId/operatorId) — se preserva.
@Injectable()
export class MachineUsageService {
  constructor(
    @Inject(MACHINE_USAGE_REPOSITORY)
    private readonly machineUsageRepository: MachineUsageRepositoryPort,
    @Inject(MACHINE_REPOSITORY)
    private readonly machineRepository: MachineRepositoryPort,
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async findAll(): Promise<MachineUsageEntity[]> {
    try {
      return await this.machineUsageRepository.findAll();
    } catch {
      throw new InternalServerErrorException(
        'Error finding all machine usages',
      );
    }
  }

  async findOne(id: string): Promise<MachineUsageEntity | null> {
    try {
      return await this.machineUsageRepository.findById(id);
    } catch {
      throw new InternalServerErrorException('Error finding machine usage');
    }
  }

  async update(
    id: string,
    data: UpdateMachineUsageData,
  ): Promise<MachineUsageEntity> {
    try {
      const existingUsage = await this.machineUsageRepository.findById(id);
      if (!existingUsage) {
        throw new InternalServerErrorException(
          `Machine usage with id ${id} not found`,
        );
      }
      const updateData = {
        ...(data.initialFuel !== undefined && {
          initialFuel: data.initialFuel,
        }),
        ...(data.finalFuel !== undefined && { finalFuel: data.finalFuel }),
        ...(data.usageHours !== undefined && { usageHours: data.usageHours }),
        ...(data.observations !== undefined && {
          observations: data.observations,
        }),
      };
      return await this.machineUsageRepository.update(id, updateData);
    } catch {
      throw new InternalServerErrorException('Error updating machine usage');
    }
  }

  // operatorId se usa SOLO para validar (operario existe y está asignado a la
  // tarea) y NO se persiste — por eso no forma parte del contrato de
  // persistencia CreateMachineUsageData (el legacy tampoco lo escribía).
  async create(
    data: CreateMachineUsageData & { operatorId: string },
  ): Promise<MachineUsageEntity> {
    // no comprendo el registro inicial de las horas, obs y combustible final de la tarea
    try {
      if (!data.machineId || !data.taskId || !data.operatorId) {
        throw new InternalServerErrorException(
          'Missing required fields: machineId, taskId, operatorId, and intialFuel',
        );
      }
      const existingMachine = await this.machineRepository.findById(
        data.machineId,
      );
      const existingTask = await this.taskRepository.findByIdWithOperators(
        data.taskId,
      );
      const existingOperator = await this.userRepository.findById(
        data.operatorId,
      );
      // valido que el operario este incluido en la tarea
      if (!existingMachine || !existingTask || !existingOperator) {
        throw new InternalServerErrorException(
          'Machine, task, or operator not found',
        );
      } else if (
        !existingTask.operators.some((op) => op.id === existingOperator.id)
      ) {
        throw new InternalServerErrorException(
          'Operator is not assigned to the task',
        );
      } else if (existingMachine.status !== MachineStatus.ACTIVA) {
        throw new InternalServerErrorException(
          'Machine esta en mantenimiento o inactiva',
        );
      } else {
        //deberiamos incluir el operario?
        const createData = {
          machineId: data.machineId,
          taskId: data.taskId,
          initialFuel: data.initialFuel,
        };
        return await this.machineUsageRepository.create(createData);
      }
    } catch {
      throw new InternalServerErrorException('Error creating machine usage');
    }
  }
}
