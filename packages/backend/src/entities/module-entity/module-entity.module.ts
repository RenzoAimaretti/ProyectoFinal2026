import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  MODULE_ENTITY_REPOSITORY,
  ModuleEntityRepositoryPort,
} from './application/module-entity.ports';
import { CreateModuleEntityUseCase } from './application/use-cases/create-module-entity.use-case';
import { FindAllModuleEntitiesUseCase } from './application/use-cases/find-all-module-entities.use-case';
import { FindModuleEntityByNameUseCase } from './application/use-cases/find-module-entity-by-name.use-case';
import { FindModuleEntityUseCase } from './application/use-cases/find-module-entity.use-case';
import { UpdateModuleEntityUseCase } from './application/use-cases/update-module-entity.use-case';
import { PrismaModuleEntityRepository } from './adapters/outbound/prisma-module-entity.repository';
import { ModuleEntityController } from './module-entity.controller';
import { ModuleEntityService } from './module-entity.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleEntityController],
  providers: [
    ModuleEntityService,
    {
      provide: MODULE_ENTITY_REPOSITORY,
      useClass: PrismaModuleEntityRepository,
    },
    {
      provide: FindAllModuleEntitiesUseCase,
      useFactory: (repository: ModuleEntityRepositoryPort) =>
        new FindAllModuleEntitiesUseCase(repository),
      inject: [MODULE_ENTITY_REPOSITORY],
    },
    {
      provide: FindModuleEntityUseCase,
      useFactory: (repository: ModuleEntityRepositoryPort) =>
        new FindModuleEntityUseCase(repository),
      inject: [MODULE_ENTITY_REPOSITORY],
    },
    {
      provide: FindModuleEntityByNameUseCase,
      useFactory: (repository: ModuleEntityRepositoryPort) =>
        new FindModuleEntityByNameUseCase(repository),
      inject: [MODULE_ENTITY_REPOSITORY],
    },
    {
      provide: CreateModuleEntityUseCase,
      useFactory: (repository: ModuleEntityRepositoryPort) =>
        new CreateModuleEntityUseCase(repository),
      inject: [MODULE_ENTITY_REPOSITORY],
    },
    {
      provide: UpdateModuleEntityUseCase,
      useFactory: (repository: ModuleEntityRepositoryPort) =>
        new UpdateModuleEntityUseCase(repository),
      inject: [MODULE_ENTITY_REPOSITORY],
    },
  ],
  exports: [ModuleEntityService],
})
export class ModuleEntityModule {}
