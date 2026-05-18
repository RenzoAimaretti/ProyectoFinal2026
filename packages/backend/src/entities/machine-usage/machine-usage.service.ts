import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MachineUsageService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.machineUsage.findMany();
  }

  findOne(id: string) {
    return this.prisma.machineUsage.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.machineUsage.create({ data });
  }
}
