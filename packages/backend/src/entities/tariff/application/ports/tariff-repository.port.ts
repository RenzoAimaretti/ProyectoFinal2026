import { TariffValues } from '../../domain/tariff.rules';
import { TariffOutput } from '../dto/tariff.output';

export const TARIFF_REPOSITORY = Symbol('TARIFF_REPOSITORY');

export interface UpsertTariffRecord {
  companyId: string;
  laborTypeId: string;
  userId: string;
  values: TariffValues;
}

export interface TariffRepositoryPort {
  findAllByCompany(companyId: string): Promise<TariffOutput[]>;
  /** Una tarifa por par firma + labor: crea o reemplaza la existente. */
  upsert(record: UpsertTariffRecord): Promise<TariffOutput>;
  /** `true` si existia una tarifa para el par y se elimino. */
  deleteByPair(companyId: string, laborTypeId: string): Promise<boolean>;
}
