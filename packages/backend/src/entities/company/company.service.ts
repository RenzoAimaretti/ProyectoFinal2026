import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Company } from '../../../prisma/generated/client';
@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Company[]> {
    try{
      return this.prisma.company.findMany();
    }catch(error){
      throw new BadRequestException('Error fetching all companies');
    }
  }

  async findOne(id: string): Promise<Company | null> {
    try{
      return this.prisma.company.findUnique({ where: { id } });
    }catch(error){
      throw new BadRequestException('Error fetching company by ID');
    }
  }

  async findByCuit(cuit: string): Promise<Company | null> {
    try{
      return this.prisma.company.findUnique({ where: { cuit } });
    }catch(error){
      throw new BadRequestException('Error fetching company by CUIT');
    }
  }

  async create(data: {name: string; cuit: string;}): Promise<Company> {
    if (!data.name || !data.cuit) {
      throw new BadRequestException('Missing required fields: name and cuit');
    }

    const existingCompany = await this.findByCuit(data.cuit);

    if (existingCompany) {
      throw new ConflictException('Company with this CUIT already exists');
    }

    return this.prisma.company.create({ data });
  }
  async update(id: string, data: {nombre?: string; cuit?: string; estado?: string}): Promise<Company> {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with id ${id} not found`);
    }

    return this.prisma.company.update({ where: { id }, data });
  }
}

