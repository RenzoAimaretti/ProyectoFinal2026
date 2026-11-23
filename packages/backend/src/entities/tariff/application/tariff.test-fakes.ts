import { TariffValues } from '../domain/tariff.rules';
import { TariffOutput } from './dto/tariff.output';
import {
  ArsValuation,
  MoneyToValue,
  MoneyValuationPort,
} from './ports/money-valuation.port';
import { LaborTypeReaderPort } from './ports/labor-type-reader.port';
import { TariffRepositoryPort } from './ports/tariff-repository.port';
import { ClockPort } from './ports/clock.port';

/** Fakes in-memory compartidos por los specs de los casos de uso de tariff. */
export class InMemoryTariffRepository implements TariffRepositoryPort {
  readonly records = new Map<string, TariffOutput>();
  private sequence = 0;

  private key(companyId: string, laborTypeId: string): string {
    return `${companyId}|${laborTypeId}`;
  }

  findAllByCompany(companyId: string): Promise<TariffOutput[]> {
    return Promise.resolve(
      [...this.records.entries()]
        .filter(([key]) => key.startsWith(`${companyId}|`))
        .map(([, record]) => record),
    );
  }

  upsert(input: {
    companyId: string;
    laborTypeId: string;
    userId: string;
    values: TariffValues;
  }): Promise<TariffOutput> {
    const key = this.key(input.companyId, input.laborTypeId);
    const existing = this.records.get(key);
    const component = (c: TariffValues['price']) => ({
      amount: c.money.amount.toString(),
      unit: c.money.unit,
      grain: c.money.grain,
      basis: c.basis,
    });
    const record: TariffOutput = {
      id: existing?.id ?? `tariff-${++this.sequence}`,
      laborTypeId: input.laborTypeId,
      price: component(input.values.price),
      cost: component(input.values.cost),
      updatedBy: input.userId,
      createdAt: existing?.createdAt ?? new Date('2026-11-23T10:00:00Z'),
      updatedAt: new Date('2026-11-23T11:00:00Z'),
    };
    this.records.set(key, record);
    return Promise.resolve(record);
  }

  deleteByPair(companyId: string, laborTypeId: string): Promise<boolean> {
    return Promise.resolve(
      this.records.delete(this.key(companyId, laborTypeId)),
    );
  }
}

export class FakeLaborTypeReader implements LaborTypeReaderPort {
  /** `tenantId|laborTypeId` de los tipos de labor vigentes. */
  constructor(private readonly active: string[]) {}

  findActiveInTenant(laborTypeId: string, tenantId: string) {
    return Promise.resolve(
      this.active.includes(`${tenantId}|${laborTypeId}`)
        ? { id: laborTypeId, name: 'Pulverización' }
        : null,
    );
  }
}

export class FakeMoneyValuation implements MoneyValuationPort {
  readonly calls: MoneyToValue[] = [];

  constructor(
    private readonly grainArsPerTon: Record<string, string | null>,
    private readonly usdRate: string | null,
  ) {}

  valueToArs(money: MoneyToValue): Promise<ArsValuation | null> {
    this.calls.push(money);
    if (money.unit === 'USD') {
      if (!this.usdRate) return Promise.resolve(null);
      return Promise.resolve({
        amountArs: (Number(money.amount) * Number(this.usdRate)).toFixed(2),
        grainArsPerTon: null,
      });
    }
    if (money.unit === 'KG_CEREAL') {
      const price = this.grainArsPerTon[money.grain as string] ?? null;
      if (!price) return Promise.resolve(null);
      return Promise.resolve({
        amountArs: ((Number(money.amount) * Number(price)) / 1000).toFixed(2),
        grainArsPerTon: price,
      });
    }
    return Promise.resolve({
      amountArs: Number(money.amount).toFixed(2),
      grainArsPerTon: null,
    });
  }
}

export class FixedClock implements ClockPort {
  now(): Date {
    return new Date('2026-11-23T12:00:00Z');
  }
}
