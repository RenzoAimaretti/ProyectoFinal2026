import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { USER_REPOSITORY } from './ports/user.repository';
import { PrismaUserRepository } from './adapters/outbound/prisma/prisma-user.repository';
import { CompanyModule } from '../company/company.module';

@Module({
  // CompanyModule provee COMPANY_REPOSITORY (puerto exportado por el dueño de la
  // entidad, REQ-F2-03 / D1) para el cross-read de empresa del service.
  imports: [PrismaModule, CompanyModule],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  // USER_REPOSITORY exportado para futuros cross-reads (mismo patrón que farm/lot).
  exports: [UserService, USER_REPOSITORY],
})
export class UserModule {}
