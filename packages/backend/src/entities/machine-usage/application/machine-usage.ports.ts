import {
  CreateMachineUsageData,
  MachineLookupRecord,
  MachineUsageRecord,
  TaskWithOperatorsLookupRecord,
  UpdateMachineUsageData,
} from './machine-usage.types';

export const MACHINE_USAGE_REPOSITORY = Symbol('MACHINE_USAGE_REPOSITORY');
export const MACHINE_READER = Symbol('MACHINE_USAGE_MACHINE_READER');
export const TASK_READER = Symbol('MACHINE_USAGE_TASK_READER');
export const USER_READER = Symbol('MACHINE_USAGE_USER_READER');

export interface MachineUsageRepositoryPort {
  findAll(): Promise<MachineUsageRecord[]>;
  findById(id: string): Promise<MachineUsageRecord | null>;
  create(data: CreateMachineUsageData): Promise<MachineUsageRecord>;
  update(id: string, data: UpdateMachineUsageData): Promise<MachineUsageRecord>;
}

export interface MachineReaderPort {
  findById(id: string): Promise<MachineLookupRecord | null>;
}

export interface TaskReaderPort {
  findByIdWithOperators(id: string): Promise<TaskWithOperatorsLookupRecord | null>;
}

export interface UserReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
