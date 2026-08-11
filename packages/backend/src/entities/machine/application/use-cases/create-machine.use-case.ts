import { EntityNotFoundError } from '../../domain/errors';
import { CompanyReaderPort, MachineRepositoryPort } from '../machine.ports';
import { CreateMachineInput, MachineRecord } from '../machine.types';
import { assertRequiredString, normalizeRequiredDate } from '../machine.validation';

export class CreateMachineUseCase {
  constructor(
    private readonly repository: MachineRepositoryPort,
    private readonly companyReader: CompanyReaderPort,
  ) {}

  async execute(input: CreateMachineInput): Promise<MachineRecord> {
    const companyId = assertRequiredString(input?.companyId, 'companyId');
    const name = assertRequiredString(input?.name, 'name');
    const brand = assertRequiredString(input?.brand, 'brand');
    const entryDate = normalizeRequiredDate(input?.entryDate, 'entryDate');

    const company = await this.companyReader.findById(companyId);
    if (!company) {
      throw new EntityNotFoundError(`Company with id ${companyId} not found`);
    }

    return this.repository.create({
      companyId,
      name,
      brand,
      entryDate,
    });
  }
}
