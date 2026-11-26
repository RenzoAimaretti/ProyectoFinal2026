import { EntityNotFoundError } from '../../domain/errors';
import {
  FakeLaborTypeReader,
  FakePendingValuationRetry,
  InMemoryTariffRepository,
} from '../tariff.test-fakes';
import { DeleteTariffUseCase } from './delete-tariff.use-case';
import { FindTariffsUseCase } from './find-tariffs.use-case';
import { UpsertTariffUseCase } from './upsert-tariff.use-case';

const price = { amount: '1', unit: 'ARS', basis: 'POR_HECTAREA' };
const cost = { amount: '1', unit: 'ARS', basis: 'POR_HORA' };

async function seeded() {
  const repository = new InMemoryTariffRepository();
  const upsert = new UpsertTariffUseCase(
    repository,
    new FakeLaborTypeReader(['tenant-1|labor-1', 'tenant-1|labor-2']),
    new FakePendingValuationRetry(),
  );
  await upsert.execute({
    companyId: 'company-1',
    tenantId: 'tenant-1',
    userId: 'a',
    laborTypeId: 'labor-1',
    price,
    cost,
  });
  await upsert.execute({
    companyId: 'company-1',
    tenantId: 'tenant-1',
    userId: 'a',
    laborTypeId: 'labor-2',
    price,
    cost,
  });
  await upsert.execute({
    companyId: 'company-2',
    tenantId: 'tenant-1',
    userId: 'a',
    laborTypeId: 'labor-1',
    price,
    cost,
  });
  return repository;
}

describe('FindTariffsUseCase', () => {
  it('lists only the tariffs of the session company', async () => {
    const result = await new FindTariffsUseCase(await seeded()).execute({
      companyId: 'company-1',
    });

    expect(result.map((tariff) => tariff.laborTypeId).sort()).toEqual([
      'labor-1',
      'labor-2',
    ]);
  });

  it('returns an empty list for a company without tariffs', async () => {
    expect(
      await new FindTariffsUseCase(await seeded()).execute({
        companyId: 'company-3',
      }),
    ).toEqual([]);
  });
});

describe('DeleteTariffUseCase', () => {
  it('removes the tariff of the pair and leaves the other companies untouched', async () => {
    const repository = await seeded();

    await new DeleteTariffUseCase(repository).execute({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
    });

    expect(
      (await repository.findAllByCompany('company-1')).map(
        (tariff) => tariff.laborTypeId,
      ),
    ).toEqual(['labor-2']);
    expect(await repository.findAllByCompany('company-2')).toHaveLength(1);
  });

  it('answers EntityNotFoundError when the pair has no tariff', async () => {
    await expect(
      new DeleteTariffUseCase(await seeded()).execute({
        companyId: 'company-1',
        laborTypeId: 'labor-9',
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
