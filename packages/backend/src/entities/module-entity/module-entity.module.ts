import { Module } from '@nestjs/common';
import { ModuleEntityService } from './module-entity.service';
import { ModuleEntityController } from './module-entity.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleEntityController],
  providers: [ModuleEntityService],
  exports: [ModuleEntityService],
})
export class ModuleEntityModule {}
