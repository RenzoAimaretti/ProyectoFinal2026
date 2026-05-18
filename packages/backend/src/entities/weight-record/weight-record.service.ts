import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeightRecordService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.weightRecord.findMany();
  }

  findOne(id: string) {
    return this.prisma.weightRecord.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.weightRecord.create({ data });
  }
}
