import { EntityNotFoundError } from '../../domain/errors';
import { parseTariffValues } from '../../domain/tariff.rules';
import { TariffOutput } from '../dto/tariff.output';
import { LaborTypeReaderPort } from '../ports/labor-type-reader.port';
import { PendingValuationRetryPort } from '../ports/pending-valuation-retry.port';
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
    private readonly pendingRetry: PendingValuationRetryPort,
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

    const saved = await this.tariffs.upsert({
      companyId: input.companyId,
      laborTypeId: laborType.id,
      userId: input.userId,
      values,
    });

    // Reports approved before this tariff existed can be valued now. Best
    // effort: the port must not throw, and a violation never changes the answer.
    try {
      await this.pendingRetry.retry({
        companyId: input.companyId,
        laborTypeId: laborType.id,
      });
    } catch {
      // The tariff is already saved; the retry also runs when the calculator opens.
    }

    return saved;
  }
}
