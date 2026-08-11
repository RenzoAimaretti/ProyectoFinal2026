import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ModuleReaderPort } from '../../application/company.ports';

@Injectable()
export class PrismaModuleReader implements ModuleReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }
}
