import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.machine.findMany();
  }

  findOne(id: string) {
    return this.prisma.machine.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.machine.create({ data });
  }
}
