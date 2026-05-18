import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FarmService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.farm.findMany();
  }

  findOne(id: string) {
    return this.prisma.farm.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.farm.create({ data });
  }
}
