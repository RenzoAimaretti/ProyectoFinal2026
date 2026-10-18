import { EntityNotFoundError } from '../../domain/errors';
import { FuelReceiptStoragePort, MachineActivityRepositoryPort } from '../machine-activity.ports';
import { assertRequiredString } from '../machine-activity.validation';

export class ReadFuelReceiptUseCase {
  constructor(
    private readonly repository: MachineActivityRepositoryPort,
    private readonly storage: FuelReceiptStoragePort,
  ) {}

  async execute(id: string, companyId: string): Promise<{ mimeType: string; bytes: Buffer }> {
    const activityId = assertRequiredString(id, 'id');
    const company = assertRequiredString(companyId, 'companyId');
    const receipt = await this.repository.findReceiptForCompany(activityId, company);
    if (!receipt) throw new EntityNotFoundError('Fuel receipt not found');
    return { mimeType: receipt.mimeType, bytes: await this.storage.read(receipt.key) };
  }
}
