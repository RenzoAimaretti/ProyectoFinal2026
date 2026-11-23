import { EcheqStatus } from '../domain/echeq.rules';
import { CreateEcheqData, EcheqRecord } from './echeq.types';

export const ECHEQ_REPOSITORY = Symbol('ECHEQ_REPOSITORY');
export const ECHEQ_CLOCK = Symbol('ECHEQ_CLOCK');
export const ECHEQ_PAYMENT_READER = Symbol('ECHEQ_PAYMENT_READER');

export interface EcheqPaymentReaderPort {
  findMethodForCompany(id: string, companyId: string): Promise<string | null>;
}

export interface EcheqClockPort {
  now(): Date;
}

export interface EcheqRepositoryPort {
  create(data: CreateEcheqData): Promise<EcheqRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<EcheqRecord | null>;
  findAllByCompany(
    companyId: string,
    status?: EcheqStatus,
  ): Promise<EcheqRecord[]>;
  changeStatus(
    id: string,
    companyId: string,
    from: EcheqStatus,
    to: EcheqStatus,
    settlementDate: Date | null,
    notes?: string | null,
  ): Promise<EcheqRecord | null>;
}
