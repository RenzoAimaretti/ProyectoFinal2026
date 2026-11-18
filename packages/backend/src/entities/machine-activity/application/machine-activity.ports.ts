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
export const FUEL_RECEIPT_STORAGE = Symbol('FUEL_RECEIPT_STORAGE');

export interface FuelReceiptStoragePort {
  write(bytes: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

export interface MachineActivityRepositoryPort {
  create(data: RegisterMachineActivityData): Promise<MachineActivityRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<MachineActivityRecord | null>;
  findAllByCompany(companyId: string): Promise<MachineActivityRecord[]>;
  attachReceiptIfAbsent(id: string, companyId: string, key: string, mimeType: string): Promise<boolean>;
  findReceiptForCompany(id: string, companyId: string): Promise<{ key: string; mimeType: string } | null>;
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
