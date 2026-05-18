import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskTypeService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.taskType.findMany();
  }

  findOne(id: string) {
    return this.prisma.taskType.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.taskType.create({ data });
  }
}
