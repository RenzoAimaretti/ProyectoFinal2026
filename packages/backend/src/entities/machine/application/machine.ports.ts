import { CreateMachineData, MachineRecord, UpdateMachineData } from './machine.types';

export const MACHINE_REPOSITORY = Symbol('MACHINE_REPOSITORY');
export const COMPANY_READER = Symbol('MACHINE_COMPANY_READER');

export interface MachineRepositoryPort {
  findAll(): Promise<MachineRecord[]>;
  findById(id: string): Promise<MachineRecord | null>;
  create(data: CreateMachineData): Promise<MachineRecord>;
  update(id: string, data: UpdateMachineData): Promise<MachineRecord>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
