import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  FIELD_CATALOG_REPOSITORY,
  FieldCatalogRepositoryPort,
} from './application/field-catalog.ports';
import { GetFieldCatalogUseCase } from './application/use-cases/get-field-catalog.use-case';
import { PrismaFieldCatalogRepository } from './adapters/outbound/prisma-field-catalog.repository';
import { FieldCatalogController } from './field-catalog.controller';
import { FieldCatalogService } from './field-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [FieldCatalogController],
  providers: [
    FieldCatalogService,
    { provide: FIELD_CATALOG_REPOSITORY, useClass: PrismaFieldCatalogRepository },
    {
      provide: GetFieldCatalogUseCase,
      useFactory: (repository: FieldCatalogRepositoryPort) =>
        new GetFieldCatalogUseCase(repository),
      inject: [FIELD_CATALOG_REPOSITORY],
    },
  ],
})
export class FieldCatalogModule {}
