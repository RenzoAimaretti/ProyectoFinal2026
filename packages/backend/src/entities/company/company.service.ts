import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Company } from '../../../prisma/generated/client';
@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Company[]> {
    return this.prisma.company.findMany();
  }

  async findOne(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async create(data: any): Promise<Company> {
    return this.prisma.company.create({ data });
  }
}

