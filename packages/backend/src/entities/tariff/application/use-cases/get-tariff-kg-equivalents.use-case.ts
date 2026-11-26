import { Dec } from '../../../valuation/domain/decimal';
import {
  GRAIN,
  Grain,
  MONEY_UNIT,
  isGrain,
} from '../../../valuation/domain/money';
import { InvalidInputError } from '../../domain/errors';
import {
  TariffComponentOutput,
  TariffKgEquivalentOutput,
  TariffKgEquivalentsOutput,
} from '../dto/tariff.output';
import { ClockPort } from '../ports/clock.port';
import { MoneyValuationPort } from '../ports/money-valuation.port';
import { TariffRepositoryPort } from '../ports/tariff-repository.port';

const KG_DECIMALS = 2;
const KG_PER_TON = Dec.parse('1000');

export interface GetTariffKgEquivalentsInput {
  companyId: string;
  /** Crudo del query string; por defecto SOJA. La eleccion es solo de interfaz. */
  grain: unknown;
}

/**
 * Equivalente en kilos de un grano elegido de los importes en ARS y USD de cada
 * tarifa, con la misma politica de valuacion que el resto del sistema.
 */
export class GetTariffKgEquivalentsUseCase {
  constructor(
    private readonly tariffs: TariffRepositoryPort,
    private readonly valuation: MoneyValuationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: GetTariffKgEquivalentsInput,
  ): Promise<TariffKgEquivalentsOutput> {
    const grain = this.parseGrain(input.grain);
    const records = await this.tariffs.findAllByCompany(input.companyId);

    // El precio por tonelada sale de valuar 1 kg: es el dato exacto de la pizarra.
    const board = await this.valuation.valueToArs({
      amount: '1',
      unit: MONEY_UNIT.KG_CEREAL,
      grain,
    });
    const pricePerTon = board?.grainArsPerTon
      ? Dec.parse(board.grainArsPerTon)
      : null;

    const items: TariffKgEquivalentOutput[] = [];
    for (const record of records) {
      items.push({
        tariffId: record.id,
        laborTypeId: record.laborTypeId,
        priceKg: await this.toKilos(record.price, grain, pricePerTon),
        costKg: await this.toKilos(record.cost, grain, pricePerTon),
      });
    }

    return {
      grain,
      grainArsPerTon: pricePerTon?.toString() ?? null,
      calculatedAt: this.clock.now(),
      items,
    };
  }

  private parseGrain(raw: unknown): Grain {
    if (raw === undefined || raw === null || raw === '') return GRAIN.SOJA;
    if (!isGrain(raw)) {
      throw new InvalidInputError(
        'El grano debe ser TRIGO, MAIZ, GIRASOL, SOJA o SORGO',
      );
    }
    return raw;
  }

  private async toKilos(
    component: TariffComponentOutput,
    grain: Grain,
    pricePerTon: Dec | null,
  ): Promise<string | null> {
    if (component.unit === MONEY_UNIT.KG_CEREAL) {
      // Ya esta en kilos; solo es comparable si es el grano elegido.
      return component.grain === grain ? component.amount : null;
    }

    if (!pricePerTon || pricePerTon.isZero()) return null;

    let ars: Dec;
    if (component.unit === MONEY_UNIT.ARS) {
      ars = Dec.parse(component.amount);
    } else {
      const valued = await this.valuation.valueToArs({
        amount: component.amount,
        unit: component.unit,
        grain: null,
      });
      if (!valued) return null;
      ars = Dec.parse(valued.amountArs);
    }

    return ars.mul(KG_PER_TON).div(pricePerTon, KG_DECIMALS).toString();
  }
}
