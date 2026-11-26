import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EcheqRepositoryPort } from '../../application/echeq.ports';
import { CreateEcheqData, EcheqRecord } from '../../application/echeq.types';
import { EcheqStatus } from '../../domain/echeq.rules';
import { DuplicateEntityError } from '../../domain/errors';

@Injectable()
export class PrismaEcheqRepository implements EcheqRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEcheqData): Promise<EcheqRecord> {
    try {
      return await this.prisma.echeq.create({ data });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new DuplicateEntityError(
          'Echeq code already exists for this company',
        );
      throw error;
    }
  }

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<EcheqRecord | null> {
    return this.prisma.echeq.findFirst({ where: { id, companyId } });
  }

  findAllByCompany(
    companyId: string,
    status?: EcheqStatus,
  ): Promise<EcheqRecord[]> {
    return this.prisma.echeq.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  async changeStatus(
    id: string,
    companyId: string,
    from: EcheqStatus,
    to: EcheqStatus,
    settlementDate: Date | null,
    notes?: string | null,
  ): Promise<EcheqRecord | null> {
    // Conditional update enforces firma isolation and the validated state under races.
    const result = await this.prisma.echeq.updateMany({
      where: { id, companyId, status: from },
      data: {
        status: to,
        settlementDate,
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    return result.count ? this.findByIdForCompany(id, companyId) : null;
  }
}
