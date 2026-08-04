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
  // COMPANY_REPOSITORY exportado para los cross-reads de farm/lot/livestock
  // (T-F2-15/T-F2-20/T-F2-23, REQ-F2-03 / D1).
  exports: [CompanyService, COMPANY_REPOSITORY],
})
export class CompanyModule {}
