import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LivestockEventService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.livestockEvent.findMany();
  }

  findOne(id: string) {
    return this.prisma.livestockEvent.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.livestockEvent.create({ data });
  }
}
