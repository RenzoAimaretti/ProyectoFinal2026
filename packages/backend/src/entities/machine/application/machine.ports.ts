import { CreateMachineData, MachineRecord, UpdateMachineData } from './machine.types';

export const MACHINE_REPOSITORY = Symbol('MACHINE_REPOSITORY');
export const COMPANY_READER = Symbol('MACHINE_COMPANY_READER');

export interface MachineRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<MachineRecord[]>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<MachineRecord | null>;
  create(data: CreateMachineData): Promise<MachineRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateMachineData,
  ): Promise<MachineRecord>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
