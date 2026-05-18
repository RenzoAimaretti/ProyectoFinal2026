import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LivestockService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.livestock.findMany();
  }

  findOne(id: string) {
    return this.prisma.livestock.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.livestock.create({ data });
  }
}
