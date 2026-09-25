import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CLIENT_REPOSITORY } from './application/client.ports';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { FindAllClientsUseCase } from './application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from './application/use-cases/find-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { ClientModule } from './client.module';

describe('ClientModule', () => {
  it('wires every client use case through the repository port', async () => {
    const repository = {
      findAllByTenantId: jest.fn().mockResolvedValue([]),
      findByIdForTenant: jest.fn().mockResolvedValue(null),
      findByNameAndTenantId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      updateForTenant: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ClientModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(CLIENT_REPOSITORY)
      .useValue(repository)
      .compile();

    expect(moduleRef.get(FindAllClientsUseCase)).toBeInstanceOf(
      FindAllClientsUseCase,
    );
    expect(moduleRef.get(FindClientUseCase)).toBeInstanceOf(FindClientUseCase);
    expect(moduleRef.get(CreateClientUseCase)).toBeInstanceOf(
      CreateClientUseCase,
    );
    expect(moduleRef.get(UpdateClientUseCase)).toBeInstanceOf(
      UpdateClientUseCase,
    );

    await expect(
      moduleRef.get(FindAllClientsUseCase).execute('tenant-1'),
    ).resolves.toEqual([]);
    expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-1');
  });
});
