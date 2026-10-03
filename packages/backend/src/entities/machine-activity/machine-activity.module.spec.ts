import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CLOCK,
  MACHINE_ACTIVITY_MACHINE_READER,
  MACHINE_ACTIVITY_REPOSITORY,
} from './application/machine-activity.ports';
import { FindAllMachineActivitiesUseCase } from './application/use-cases/find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from './application/use-cases/find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from './application/use-cases/register-machine-activity.use-case';
import { MachineActivityModule } from './machine-activity.module';

describe('MachineActivityModule', () => {
  it('wires every machine activity use case through its ports', async () => {
    const repository = {
      create: jest.fn(),
      findByIdForCompany: jest.fn().mockResolvedValue(null),
      findAllByCompany: jest.fn().mockResolvedValue([]),
    };
    const machineReader = {
      findByIdForCompany: jest.fn().mockResolvedValue({ id: 'machine-1' }),
    };
    const clock = { now: jest.fn().mockReturnValue(new Date()) };

    const moduleRef = await Test.createTestingModule({
      imports: [MachineActivityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MACHINE_ACTIVITY_REPOSITORY)
      .useValue(repository)
      .overrideProvider(MACHINE_ACTIVITY_MACHINE_READER)
      .useValue(machineReader)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();

    expect(moduleRef.get(FindAllMachineActivitiesUseCase)).toBeInstanceOf(
      FindAllMachineActivitiesUseCase,
    );
    expect(moduleRef.get(FindMachineActivityUseCase)).toBeInstanceOf(
      FindMachineActivityUseCase,
    );
    expect(moduleRef.get(RegisterMachineActivityUseCase)).toBeInstanceOf(
      RegisterMachineActivityUseCase,
    );

    await expect(
      moduleRef.get(FindAllMachineActivitiesUseCase).execute('company-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByCompany).toHaveBeenCalledWith('company-1');
  });
});
