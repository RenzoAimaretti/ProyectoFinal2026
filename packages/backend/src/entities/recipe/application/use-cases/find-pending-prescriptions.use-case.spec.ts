import { InvalidInputError } from '../../domain/errors';
import { PendingPrescriptionReaderPort } from '../recipe.ports';
import { PendingPrescriptionTask } from '../recipe.types';
import { FindPendingPrescriptionsUseCase } from './find-pending-prescriptions.use-case';

const pendingTask: PendingPrescriptionTask = {
  id: 'task-1',
  lotId: 'lot-1',
  lotName: 'Lote N°1',
  farmName: 'Agro-Sur',
  lotArea: 12.5,
  laborTypeId: 'task-type-1',
  laborTypeName: 'Pulverización',
  status: 'PENDIENTE',
  startedAt: new Date('2026-01-10T00:00:00.000Z'),
  prescriptionStatus: 'SIN_RECETA',
};

function createReader(): jest.Mocked<PendingPrescriptionReaderPort> {
  return {
    findPendingByTenant: jest.fn(),
  };
}

describe('FindPendingPrescriptionsUseCase', () => {
  let reader: jest.Mocked<PendingPrescriptionReaderPort>;
  let useCase: FindPendingPrescriptionsUseCase;

  beforeEach(() => {
    reader = createReader();
    useCase = new FindPendingPrescriptionsUseCase(reader);
  });

  it('returns the pending inbox scoped to the caller tenant', async () => {
    reader.findPendingByTenant.mockResolvedValue([pendingTask]);

    await expect(useCase.execute('tenant-1')).resolves.toEqual([pendingTask]);
    expect(reader.findPendingByTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('returns an empty inbox when nothing waits for a prescription', async () => {
    reader.findPendingByTenant.mockResolvedValue([]);

    await expect(useCase.execute('tenant-2')).resolves.toEqual([]);
    expect(reader.findPendingByTenant).toHaveBeenCalledWith('tenant-2');
  });

  it('rejects an empty tenant before touching the reader', async () => {
    await expect(useCase.execute('   ')).rejects.toBeInstanceOf(
      InvalidInputError,
    );

    expect(reader.findPendingByTenant).not.toHaveBeenCalled();
  });
});
