import { AttachFuelReceiptUseCase } from './attach-fuel-receipt.use-case';
import { ReadFuelReceiptUseCase } from './read-fuel-receipt.use-case';
import { FuelReceiptStoragePort, MachineActivityRepositoryPort } from '../machine-activity.ports';
import { EntityNotFoundError, InvalidInputError, ReceiptAlreadyAttachedError } from '../../domain/errors';

const bytes = Buffer.from('%PDF-1.4\nreceipt\n%%EOF');
const url = `data:application/pdf;base64,${bytes.toString('base64')}`;

function setup() {
  const repository = {
    findByIdForCompany: jest.fn(),
    attachReceiptIfAbsent: jest.fn(),
    findReceiptForCompany: jest.fn(),
  } as unknown as jest.Mocked<MachineActivityRepositoryPort>;
  const storage = {
    write: jest.fn().mockResolvedValue('f2d4b906-32a3-4a9b-884d-b8f15703cbbe'),
    read: jest.fn().mockResolvedValue(bytes),
    remove: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<FuelReceiptStoragePort>;
  repository.findByIdForCompany.mockResolvedValue({ type: 'COMBUSTIBLE', hasReceipt: false } as never);
  repository.attachReceiptIfAbsent.mockResolvedValue(true);
  return { repository, storage, attach: new AttachFuelReceiptUseCase(repository, storage), read: new ReadFuelReceiptUseCase(repository, storage) };
}

describe('private fuel receipts', () => {
  it('attaches once and reads bytes only through the caller company scope', async () => {
    const { repository, storage, attach, read } = setup();
    repository.findReceiptForCompany.mockResolvedValue({ key: 'f2d4b906-32a3-4a9b-884d-b8f15703cbbe', mimeType: 'application/pdf' });
    await attach.execute('activity-1', 'company-1', url);
    await expect(read.execute('activity-1', 'company-1')).resolves.toEqual({ mimeType: 'application/pdf', bytes });
    expect(repository.attachReceiptIfAbsent).toHaveBeenCalledWith('activity-1', 'company-1', expect.any(String), 'application/pdf');
    expect(repository.findReceiptForCompany).toHaveBeenCalledWith('activity-1', 'company-1');
    expect(storage.write).toHaveBeenCalledWith(bytes);
    expect(storage.read).toHaveBeenCalledWith(expect.any(String));
  });

  it.each([
    ['foreign company', null, url, EntityNotFoundError],
    ['non-fuel activity', { type: 'MANTENIMIENTO', hasReceipt: false }, url, EntityNotFoundError],
    ['duplicate attachment', { type: 'COMBUSTIBLE', hasReceipt: true }, url, ReceiptAlreadyAttachedError],
    ['invalid content', { type: 'COMBUSTIBLE', hasReceipt: false }, 'data:application/pdf;base64,@@', InvalidInputError],
  ])('rejects %s without writing storage or metadata', async (_name, activity, data, errorType) => {
    const { repository, storage, attach } = setup();
    repository.findByIdForCompany.mockResolvedValue(activity as never);
    await expect(attach.execute('activity-1', 'company-2', data)).rejects.toBeInstanceOf(errorType);
    expect(repository.attachReceiptIfAbsent).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('cleans up a concurrent duplicate and never replaces the first attachment', async () => {
    const { repository, storage, attach } = setup();
    repository.attachReceiptIfAbsent.mockResolvedValue(false);
    await expect(attach.execute('activity-1', 'company-1', url)).rejects.toBeInstanceOf(ReceiptAlreadyAttachedError);
    expect(storage.remove).toHaveBeenCalledWith('f2d4b906-32a3-4a9b-884d-b8f15703cbbe');
  });

  it('rejects absent or foreign receipt reads before touching private storage', async () => {
    const { repository, storage, read } = setup();
    repository.findReceiptForCompany.mockResolvedValue(null);
    await expect(read.execute('activity-1', 'company-2')).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(storage.read).not.toHaveBeenCalled();
  });
});
