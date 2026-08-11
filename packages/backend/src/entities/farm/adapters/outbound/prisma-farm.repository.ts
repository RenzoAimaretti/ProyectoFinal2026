import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CompanyReaderPort,
  FarmRepositoryPort,
} from '../../application/farm.ports';
import {
  CreateFarmInput,
  FarmRecord,
  UpdateFarmInput,
} from '../../application/farm.types';

@Injectable()
export class PrismaFarmRepository
  implements FarmRepositoryPort, CompanyReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<FarmRecord[]> {
    return this.prisma.farm.findMany();
  }

  findById(id: string): Promise<FarmRecord | null> {
    return this.prisma.farm.findUnique({
      where: { id },
    });
  }

  findByNameAndCompanyId(
    name: string,
    companyId: string,
  ): Promise<FarmRecord | null> {
    return this.prisma.farm.findFirst({
      where: { name, companyId },
    });
  }

  create(data: CreateFarmInput): Promise<FarmRecord> {
    return this.prisma.farm.create({
      data: {
        name: data.name,
        location: data.location,
        companyId: data.companyId,
        surface: data.surface,
      },
    });
  }

  update(id: string, data: UpdateFarmInput): Promise<FarmRecord> {
    return this.prisma.farm.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
        ...(data.surface !== undefined ? { surface: data.surface } : {}),
      },
    });
  }
}
