import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import {
  FakeLaborTypeReader,
  InMemoryTariffRepository,
} from '../tariff.test-fakes';
import { UpsertTariffUseCase } from './upsert-tariff.use-case';

const price = {
  amount: '12',
  unit: 'KG_CEREAL',
  grain: 'SOJA',
  basis: 'POR_HECTAREA',
};
const cost = { amount: '8000', unit: 'ARS', basis: 'POR_HORA' };

function harness() {
  const repository = new InMemoryTariffRepository();
  const laborTypes = new FakeLaborTypeReader([
    'tenant-1|labor-1',
    'tenant-1|labor-2',
    'tenant-2|labor-9',
  ]);
  const useCase = new UpsertTariffUseCase(repository, laborTypes);
  const base = {
    companyId: 'company-1',
    tenantId: 'tenant-1',
    userId: 'admin-1',
    laborTypeId: 'labor-1',
  };
  return { repository, useCase, base };
}

describe('UpsertTariffUseCase', () => {
  it('persists a tariff for the session company and records who saved it', async () => {
    const { repository, useCase, base } = harness();

    const result = await useCase.execute({ ...base, price, cost });

    expect(result.laborTypeId).toBe('labor-1');
    expect(result.price).toEqual({
      amount: '12',
      unit: 'KG_CEREAL',
      grain: 'SOJA',
      basis: 'POR_HECTAREA',
    });
    expect(result.cost).toEqual({
      amount: '8000',
      unit: 'ARS',
      grain: null,
      basis: 'POR_HORA',
    });
    expect(result.updatedBy).toBe('admin-1');
    expect(await repository.findAllByCompany('company-1')).toHaveLength(1);
    expect(await repository.findAllByCompany('company-2')).toHaveLength(0);
  });

  it('updates the existing tariff of the pair instead of creating another', async () => {
    const { repository, useCase, base } = harness();

    const first = await useCase.execute({ ...base, price, cost });
    const second = await useCase.execute({
      ...base,
      userId: 'admin-2',
      price: { ...price, amount: '15' },
      cost,
    });

    expect(second.id).toBe(first.id);
    expect(second.price.amount).toBe('15');
    expect(second.updatedBy).toBe('admin-2');
    expect(await repository.findAllByCompany('company-1')).toHaveLength(1);
  });

  it('keeps one tariff per labor type of the same company', async () => {
    const { repository, useCase, base } = harness();

    await useCase.execute({ ...base, price, cost });
    await useCase.execute({ ...base, laborTypeId: 'labor-2', price, cost });

    expect(await repository.findAllByCompany('company-1')).toHaveLength(2);
  });

  it('answers a missing price with InvalidInputError and persists nothing', async () => {
    const { repository, useCase, base } = harness();

    await expect(
      useCase.execute({ ...base, price: undefined, cost }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(repository.records.size).toBe(0);
  });

  it('answers a missing standard cost with InvalidInputError and persists nothing', async () => {
    const { repository, useCase, base } = harness();

    await expect(
      useCase.execute({ ...base, price, cost: undefined }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(repository.records.size).toBe(0);
  });

  it('accepts a price of 0 (Traslado)', async () => {
    const { useCase, base } = harness();

    const result = await useCase.execute({
      ...base,
      price: { amount: '0', unit: 'ARS', basis: 'POR_HORA' },
      cost,
    });

    expect(result.price.amount).toBe('0');
  });

  it('rejects kilos without grain and a grain with ARS', async () => {
    const { repository, useCase, base } = harness();

    await expect(
      useCase.execute({ ...base, price: { ...price, grain: undefined }, cost }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      useCase.execute({ ...base, price, cost: { ...cost, grain: 'SOJA' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(repository.records.size).toBe(0);
  });

  it('rejects a labor type that belongs to another tenant', async () => {
    const { repository, useCase, base } = harness();

    await expect(
      useCase.execute({ ...base, laborTypeId: 'labor-9', price, cost }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(repository.records.size).toBe(0);
  });

  it('rejects an unknown or deleted labor type', async () => {
    const { useCase, base } = harness();

    await expect(
      useCase.execute({ ...base, laborTypeId: 'deleted-labor', price, cost }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
