import { TariffOutput } from '../dto/tariff.output';
import { TariffRepositoryPort } from '../ports/tariff-repository.port';

export class FindTariffsUseCase {
  constructor(private readonly tariffs: TariffRepositoryPort) {}

  execute(input: { companyId: string }): Promise<TariffOutput[]> {
    return this.tariffs.findAllByCompany(input.companyId);
  }
}
