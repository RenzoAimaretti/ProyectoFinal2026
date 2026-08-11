import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { COMPANY_READER, MACHINE_REPOSITORY, CompanyReaderPort, MachineRepositoryPort } from './application/machine.ports';
import { CreateMachineUseCase } from './application/use-cases/create-machine.use-case';
import { FindAllMachinesUseCase } from './application/use-cases/find-all-machines.use-case';
import { FindMachineUseCase } from './application/use-cases/find-machine.use-case';
import { UpdateMachineUseCase } from './application/use-cases/update-machine.use-case';
import { PrismaCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaMachineRepository } from './adapters/outbound/prisma-machine.repository';
import { MachineController } from './machine.controller';
import { MachineService } from './machine.service';

@Module({
  imports: [PrismaModule],
  controllers: [MachineController],
  providers: [
    MachineService,
    { provide: MACHINE_REPOSITORY, useClass: PrismaMachineRepository },
    { provide: COMPANY_READER, useClass: PrismaCompanyReader },
    {
      provide: FindAllMachinesUseCase,
      useFactory: (repository: MachineRepositoryPort) => new FindAllMachinesUseCase(repository),
      inject: [MACHINE_REPOSITORY],
    },
    {
      provide: FindMachineUseCase,
      useFactory: (repository: MachineRepositoryPort) => new FindMachineUseCase(repository),
      inject: [MACHINE_REPOSITORY],
    },
    {
      provide: CreateMachineUseCase,
      useFactory: (repository: MachineRepositoryPort, companyReader: CompanyReaderPort) =>
        new CreateMachineUseCase(repository, companyReader),
      inject: [MACHINE_REPOSITORY, COMPANY_READER],
    },
    {
      provide: UpdateMachineUseCase,
      useFactory: (repository: MachineRepositoryPort) => new UpdateMachineUseCase(repository),
      inject: [MACHINE_REPOSITORY],
    },
  ],
  exports: [MachineService],
})
export class MachineModule {}
