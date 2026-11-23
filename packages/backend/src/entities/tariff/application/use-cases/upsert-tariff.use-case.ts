import { EntityNotFoundError } from '../../domain/errors';
import { parseTariffValues } from '../../domain/tariff.rules';
import { TariffOutput } from '../dto/tariff.output';
import { LaborTypeReaderPort } from '../ports/labor-type-reader.port';
import { TariffRepositoryPort } from '../ports/tariff-repository.port';

export interface UpsertTariffInput {
  /** De `req.user.firmaId`; nunca del body. */
  companyId: string;
  /** De `req.user.tenantId`. */
  tenantId: string;
  userId: string;
  laborTypeId: string;
  /** Crudo (viene del borde HTTP): se valida en el dominio. */
  price: unknown;
  cost: unknown;
}

export class UpsertTariffUseCase {
  constructor(
    private readonly tariffs: TariffRepositoryPort,
    private readonly laborTypes: LaborTypeReaderPort,
  ) {}

  async execute(input: UpsertTariffInput): Promise<TariffOutput> {
    const values = parseTariffValues({ price: input.price, cost: input.cost });

    const laborType = await this.laborTypes.findActiveInTenant(
      input.laborTypeId,
      input.tenantId,
    );
    if (!laborType) {
      throw new EntityNotFoundError('Labor type not found');
    }

    return this.tariffs.upsert({
      companyId: input.companyId,
      laborTypeId: laborType.id,
      userId: input.userId,
      values,
    });
  }
}
