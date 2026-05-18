import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModuleEntityService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.module.findMany();
  }

  findOne(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.module.create({ data });
  }
}
