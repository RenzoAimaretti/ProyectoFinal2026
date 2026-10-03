import { EntityNotFoundError } from '../../domain/errors';
import { CompanyReaderPort, MachineRepositoryPort } from '../machine.ports';
import { CreateMachineInput, MachineRecord } from '../machine.types';
import { assertRequiredString, normalizeRequiredDate } from '../machine.validation';

export class CreateMachineUseCase {
  constructor(
    private readonly repository: MachineRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(companyId: string, input: CreateMachineInput): Promise<MachineRecord> {
    const tenantCompanyId = assertRequiredString(companyId, 'companyId');
    const name = assertRequiredString(input?.name, 'name');
    const brand = assertRequiredString(input?.brand, 'brand');
    const entryDate = normalizeRequiredDate(input?.entryDate, 'entryDate');

    const company = await this.companyReader.findById(tenantCompanyId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${tenantCompanyId} not found`);
    }

    return this.repository.create({
      companyId: tenantCompanyId,
      name,
      brand,
      entryDate,
    });
  }
}
