import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { INPUT_REPOSITORY, INPUT_STOCK_READER } from './application/input.ports';
import { CreateInputUseCase } from './application/use-cases/create-input.use-case';
import { FindAllInputsUseCase } from './application/use-cases/find-all-inputs.use-case';
import { FindInputUseCase } from './application/use-cases/find-input.use-case';
import { UpdateInputUseCase } from './application/use-cases/update-input.use-case';
import { InputModule } from './input.module';

describe('InputModule', () => {
  it('wires every input use case through the repository port', async () => {
    const repository = {
      findAllByTenantId: jest.fn().mockResolvedValue([]),
      findByIdForTenant: jest.fn().mockResolvedValue(null),
      findByNameAndTenantId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      updateForTenant: jest.fn(),
    };

    const stockReader = { hasNonZeroBalance: jest.fn().mockResolvedValue(false) };

    const moduleRef = await Test.createTestingModule({
      imports: [InputModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(INPUT_REPOSITORY)
      .useValue(repository)
      .overrideProvider(INPUT_STOCK_READER)
      .useValue(stockReader)
      .compile();

    expect(moduleRef.get(FindAllInputsUseCase)).toBeInstanceOf(
      FindAllInputsUseCase,
    );
    expect(moduleRef.get(FindInputUseCase)).toBeInstanceOf(FindInputUseCase);
    expect(moduleRef.get(CreateInputUseCase)).toBeInstanceOf(
      CreateInputUseCase,
    );
    expect(moduleRef.get(UpdateInputUseCase)).toBeInstanceOf(
      UpdateInputUseCase,
    );

    await expect(
      moduleRef.get(FindAllInputsUseCase).execute('tenant-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-1');
  });
});
