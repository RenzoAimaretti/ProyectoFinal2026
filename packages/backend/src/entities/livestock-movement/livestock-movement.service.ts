import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LivestockMovementService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.livestockMovement.findMany();
  }

  findOne(id: string) {
    return this.prisma.livestockMovement.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.livestockMovement.create({ data });
  }
}
