import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChequeRepositoryPort } from '../../application/cheque.ports';
import { ChequeRecord, CreateChequeData } from '../../application/cheque.types';
import { ChequeStatus } from '../../domain/cheque-status';
import { DuplicateEntityError } from '../../domain/errors';

@Injectable()
export class PrismaChequeRepository implements ChequeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateChequeData): Promise<ChequeRecord> {
    try {
      return await this.prisma.cheque.create({ data });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateEntityError(
          'Cheque number and issuer already exist for this company',
        );
      }
      throw error;
    }
  }

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<ChequeRecord | null> {
    return this.prisma.cheque.findFirst({ where: { id, companyId } });
  }

  findAllByCompany(
    companyId: string,
    status?: ChequeStatus,
  ): Promise<ChequeRecord[]> {
    return this.prisma.cheque.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  async changeStatus(
    id: string,
    companyId: string,
    from: ChequeStatus,
    to: ChequeStatus,
  ): Promise<ChequeRecord | null> {
    // Conditional update keeps both firma isolation and the validated transition intact under races.
    const result = await this.prisma.cheque.updateMany({
      where: { id, companyId, status: from },
      data: { status: to },
    });
    return result.count ? this.findByIdForCompany(id, companyId) : null;
  }
}
