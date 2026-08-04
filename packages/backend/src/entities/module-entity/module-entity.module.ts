import { Module } from '@nestjs/common';
import { ModuleEntityService } from './module-entity.service';
import { ModuleEntityController } from './module-entity.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MODULE_ENTITY_REPOSITORY } from './ports/module-entity.repository';
import { PrismaModuleEntityRepository } from './adapters/outbound/prisma/prisma-module-entity.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleEntityController],
  providers: [
    ModuleEntityService,
    {
      provide: MODULE_ENTITY_REPOSITORY,
      useClass: PrismaModuleEntityRepository,
    },
  ],
  exports: [ModuleEntityService, MODULE_ENTITY_REPOSITORY],
})
export class ModuleEntityModule {}
