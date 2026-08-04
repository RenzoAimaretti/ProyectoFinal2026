import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleEntityModule } from '../module-entity/module-entity.module';
import { COMPANY_REPOSITORY } from './ports/company.repository';
import { PrismaCompanyRepository } from './adapters/outbound/prisma/prisma-company.repository';

@Module({
  // ModuleEntityModule provee MODULE_ENTITY_REPOSITORY (puerto exportado por el
  // dueño de la entidad, REQ-F2-03 / D1) para el cross-read de addModule.
  imports: [PrismaModule, ModuleEntityModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
