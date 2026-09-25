import {
  MachineActivityRecord,
  RegisterMachineActivityData,
} from './machine-activity.types';

export const MACHINE_ACTIVITY_REPOSITORY = Symbol(
  'MACHINE_ACTIVITY_REPOSITORY',
);
export const MACHINE_ACTIVITY_MACHINE_READER = Symbol(
  'MACHINE_ACTIVITY_MACHINE_READER',
);
export const CLOCK = Symbol('MACHINE_ACTIVITY_CLOCK');

export interface MachineActivityRepositoryPort {
  create(data: RegisterMachineActivityData): Promise<MachineActivityRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<MachineActivityRecord | null>;
  findAllByCompany(companyId: string): Promise<MachineActivityRecord[]>;
}

export interface MachineReaderPort {
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<{ id: string } | null>;
}

export interface ClockPort {
  now(): Date;
}
