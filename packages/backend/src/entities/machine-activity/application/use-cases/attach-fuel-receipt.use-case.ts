import { EntityNotFoundError, ReceiptAlreadyAttachedError } from '../../domain/errors';
import { parseFuelReceipt } from '../../domain/fuel-receipt.rules';
import { FuelReceiptStoragePort, MachineActivityRepositoryPort } from '../machine-activity.ports';
import { assertRequiredString } from '../machine-activity.validation';

export class AttachFuelReceiptUseCase {
  constructor(
    private readonly repository: MachineActivityRepositoryPort,
    private readonly storage: FuelReceiptStoragePort,
  ) {}

  async execute(id: string, companyId: string, dataUrl: unknown): Promise<void> {
    const activityId = assertRequiredString(id, 'id');
    const company = assertRequiredString(companyId, 'companyId');
    const activity = await this.repository.findByIdForCompany(activityId, company);
    if (!activity || activity.type !== 'COMBUSTIBLE') {
      throw new EntityNotFoundError('Fuel activity not found');
    }
    if (activity.hasReceipt) throw new ReceiptAlreadyAttachedError();
    const receipt = parseFuelReceipt(dataUrl);
    const key = await this.storage.write(receipt.bytes);
    try {
      const attached = await this.repository.attachReceiptIfAbsent(activityId, company, key, receipt.mimeType);
      if (!attached) throw new ReceiptAlreadyAttachedError();
    } catch (error) {
      await this.storage.remove(key);
      throw error;
    }
  }
}
