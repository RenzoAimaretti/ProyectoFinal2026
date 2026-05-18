import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LotService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.lot.findMany();
  }

  findOne(id: string) {
    return this.prisma.lot.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.lot.create({ data });
  }
}
