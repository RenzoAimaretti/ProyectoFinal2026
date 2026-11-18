import { ChequeStatus } from '../domain/cheque-status';
import { ChequeRecord, CreateChequeData } from './cheque.types';

export const CHEQUE_REPOSITORY = Symbol('CHEQUE_REPOSITORY');

export interface ChequeRepositoryPort {
  create(data: CreateChequeData): Promise<ChequeRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<ChequeRecord | null>;
  findAllByCompany(
    companyId: string,
    status?: ChequeStatus,
  ): Promise<ChequeRecord[]>;
  changeStatus(
    id: string,
    companyId: string,
    from: ChequeStatus,
    to: ChequeStatus,
  ): Promise<ChequeRecord | null>;
}
