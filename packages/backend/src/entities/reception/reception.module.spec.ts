import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RECEPTION_CLIENT_READER,
  RECEPTION_CLOCK,
  RECEPTION_INPUT_READER,
  RECEPTION_REPOSITORY,
  RECEPTION_VALIDATION,
} from './application/reception.ports';
import { CreateReceptionUseCase } from './application/use-cases/create-reception.use-case';
import { FindReceptionByTenantUseCase } from './application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionUseCase } from './application/use-cases/find-reception.use-case';
import { FindReceptionsByClientUseCase } from './application/use-cases/find-receptions-by-client.use-case';
import { FindReceptionsByTenantUseCase } from './application/use-cases/find-receptions-by-tenant.use-case';
import { RejectReceptionUseCase } from './application/use-cases/reject-reception.use-case';
import { ValidateReceptionUseCase } from './application/use-cases/validate-reception.use-case';
import { ReceptionModule } from './reception.module';

describe('ReceptionModule', () => {
  it('wires every reception use case through its ports', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({ id: 'reception-1', items: [] }),
      findByIdForClient: jest.fn().mockResolvedValue({
        id: 'reception-1',
        clientId: 'client-1',
        status: 'PENDIENTE_VALIDACION',
        items: [{ id: 'item-1', inputId: 'input-1', quantity: 10 }],
      }),
      findAllByClient: jest.fn().mockResolvedValue([]),
      findAllByTenant: jest.fn().mockResolvedValue([]),
      findByIdForTenant: jest.fn().mockResolvedValue(null),
    };
    const validation = {
      validateWithStock: jest
        .fn()
        .mockResolvedValue({ id: 'reception-1', items: [] }),
      reject: jest.fn().mockResolvedValue({ id: 'reception-1', items: [] }),
    };
    const clientReader = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'client-1', tenantId: 'tenant-1' }),
    };
    const inputReader = {
      findExistingForTenant: jest.fn().mockResolvedValue([]),
    };
    const clock = { now: jest.fn().mockReturnValue(new Date()) };

    const moduleRef = await Test.createTestingModule({
      imports: [ReceptionModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RECEPTION_REPOSITORY)
      .useValue(repository)
      .overrideProvider(RECEPTION_VALIDATION)
      .useValue(validation)
      .overrideProvider(RECEPTION_CLIENT_READER)
      .useValue(clientReader)
      .overrideProvider(RECEPTION_INPUT_READER)
      .useValue(inputReader)
      .overrideProvider(RECEPTION_CLOCK)
      .useValue(clock)
      .compile();

    expect(moduleRef.get(FindReceptionsByClientUseCase)).toBeInstanceOf(
      FindReceptionsByClientUseCase,
    );
    expect(moduleRef.get(FindReceptionsByTenantUseCase)).toBeInstanceOf(
      FindReceptionsByTenantUseCase,
    );
    expect(moduleRef.get(FindReceptionUseCase)).toBeInstanceOf(
      FindReceptionUseCase,
    );
    expect(moduleRef.get(FindReceptionByTenantUseCase)).toBeInstanceOf(
      FindReceptionByTenantUseCase,
    );
    expect(moduleRef.get(CreateReceptionUseCase)).toBeInstanceOf(
      CreateReceptionUseCase,
    );
    expect(moduleRef.get(ValidateReceptionUseCase)).toBeInstanceOf(
      ValidateReceptionUseCase,
    );
    expect(moduleRef.get(RejectReceptionUseCase)).toBeInstanceOf(
      RejectReceptionUseCase,
    );

    await expect(
      moduleRef.get(FindReceptionsByClientUseCase).execute('client-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByClient).toHaveBeenCalledWith('client-1');

    await expect(
      moduleRef
        .get(ValidateReceptionUseCase)
        .execute('client-1', 'reception-1', 'user-1', [
          { inputId: 'input-1', validatedQuantity: 6 },
        ]),
    ).resolves.toEqual({ id: 'reception-1', items: [] });
    expect(validation.validateWithStock).toHaveBeenCalledWith({
      id: 'reception-1',
      clientId: 'client-1',
      validatedBy: 'user-1',
      validatedAt: expect.any(Date),
      items: [{ inputId: 'input-1', validatedQuantity: 6 }],
    });
  });
});
