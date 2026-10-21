import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import {
  ReceptionRecord,
  RejectReceptionData,
  ValidateReceptionData,
} from '../../application/reception.types';
import { PrismaReceptionValidationAdapter } from './prisma-reception-validation.adapter';

const validationDate = new Date('2026-04-02T09:30:00.000Z');

const pendingReception = {
  id: 'reception-1',
  clientId: 'client-1',
  date: new Date('2026-04-01T00:00:00.000Z'),
  status: 'PENDIENTE_VALIDACION',
  rejectionReason: null,
  validatedBy: null,
  validatedAt: null,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      receptionId: 'reception-1',
      inputId: 'input-1',
      quantity: 10,
      validatedQuantity: null,
      unit: 'L',
      input: { name: 'Glifosato', unit: 'L' },
    },
    {
      id: 'item-2',
      receptionId: 'reception-1',
      inputId: 'input-2',
      quantity: 4,
      validatedQuantity: null,
      unit: 'kg',
      input: { name: 'Urea', unit: 'KG' },
    },
  ],
};

/**
 * Stored row after a mutual agreement with a surplus on the first item and a
 * shortage on the second one.
 */
const storedValidatedReception = {
  ...pendingReception,
  status: 'VALIDADA',
  validatedBy: 'user-1',
  validatedAt: validationDate,
  items: [
    { ...pendingReception.items[0], validatedQuantity: 12 },
    { ...pendingReception.items[1], validatedQuantity: 3 },
  ],
};

const expectedValidatedRecord: ReceptionRecord = {
  ...storedValidatedReception,
  status: 'VALIDADA',
  photos: [],
  items: [
    {
      id: 'item-1',
      receptionId: 'reception-1',
      inputId: 'input-1',
      quantity: 10,
      validatedQuantity: 12,
      quantityVariance: 2,
      variance: 2,
      inputName: 'Glifosato',
      unit: 'L',
    },
    {
      id: 'item-2',
      receptionId: 'reception-1',
      inputId: 'input-2',
      quantity: 4,
      validatedQuantity: 3,
      quantityVariance: -1,
      variance: -1,
      inputName: 'Urea',
      unit: 'kg',
    },
  ],
};

const expectedInclude = {
  client: { select: { name: true } },
  items: {
    orderBy: [{ id: 'asc' }],
    include: { input: { select: { name: true, unit: true } } },
  },
};

describe('PrismaReceptionValidationAdapter', () => {
  const tx = {
    reception: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    receptionItem: {
      updateMany: jest.fn(),
    },
    stock: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    reception: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    receptionItem: { updateMany: jest.fn() },
    stock: { upsert: jest.fn(), updateMany: jest.fn() },
  };

  const adapter = new PrismaReceptionValidationAdapter(prisma as never);

  const validateData: ValidateReceptionData = {
    id: 'reception-1',
    clientId: 'client-1',
    validatedBy: 'user-1',
    validatedAt: validationDate,
    items: [
      { inputId: 'input-1', validatedQuantity: 12 },
      { inputId: 'input-2', validatedQuantity: 3 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.reception.findFirst.mockResolvedValue(pendingReception);
    tx.reception.updateMany.mockResolvedValue({ count: 1 });
    tx.reception.findFirstOrThrow.mockResolvedValue(storedValidatedReception);
    tx.receptionItem.updateMany.mockResolvedValue({ count: 1 });
    tx.stock.upsert.mockResolvedValue({});
    tx.stock.updateMany.mockResolvedValue({ count: 1 });
    tx.stock.findUnique.mockResolvedValue(null);
  });

  it('runs the whole validation inside a single transaction', async () => {
    await adapter.validateWithStock(validateData);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.reception.updateMany).not.toHaveBeenCalled();
    expect(prisma.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(prisma.stock.upsert).not.toHaveBeenCalled();
  });

  it('persists the agreed validated quantity on every item inside the reception', async () => {
    await adapter.validateWithStock(validateData);

    expect(tx.receptionItem.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'item-1', receptionId: 'reception-1' },
      data: { validatedQuantity: 12 },
    });
    expect(tx.receptionItem.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'item-2', receptionId: 'reception-1' },
      data: { validatedQuantity: 3 },
    });
  });

  it('enters the stock with the validated quantity, never with the expected one', async () => {
    await adapter.validateWithStock(validateData);

    expect(tx.stock.upsert).toHaveBeenNthCalledWith(1, {
      where: { clientId_inputId: { clientId: 'client-1', inputId: 'input-1' } },
      create: { clientId: 'client-1', inputId: 'input-1', quantity: 12, unit: 'L' },
      update: { quantity: { increment: 12 }, unit: 'L' },
    });
    expect(tx.stock.upsert).toHaveBeenNthCalledWith(2, {
      where: { clientId_inputId: { clientId: 'client-1', inputId: 'input-2' } },
      create: { clientId: 'client-1', inputId: 'input-2', quantity: 3, unit: 'KG' },
      update: { quantity: { increment: 3 }, unit: 'KG' },
    });
  });

  it('moves the reception to validated through a pending guarded write and returns the stored row', async () => {
    const record = await adapter.validateWithStock(validateData);

    expect(tx.reception.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'reception-1',
        clientId: 'client-1',
        status: 'PENDIENTE_VALIDACION',
      },
      data: {
        status: 'VALIDADA',
        validatedBy: 'user-1',
        validatedAt: validationDate,
      },
    });
    expect(tx.reception.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'reception-1', clientId: 'client-1' },
      include: expectedInclude,
    });
    expect(record).toEqual(expectedValidatedRecord);
  });

  it('returns the shortage or surplus of every item as validated minus expected', async () => {
    const record = await adapter.validateWithStock(validateData);

    expect(record.items.map((item) => item.quantityVariance)).toEqual([2, -1]);
    expect(record.items.map((item) => item.quantity)).toEqual([10, 4]);
  });

  it('never partitions the stock entry by company', async () => {
    await adapter.validateWithStock(validateData);

    const calls = JSON.stringify(tx.stock.upsert.mock.calls);

    expect(calls).not.toContain('companyId');
  });

  it('fails without writing anything when the decision leaves a declared input unvalidated', async () => {
    await expect(
      adapter.validateWithStock({
        ...validateData,
        items: [{ inputId: 'input-1', validatedQuantity: 12 }],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);

    expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.reception.updateMany).not.toHaveBeenCalled();
  });

  it('fails without writing anything when the decision validates an input outside the reception', async () => {
    await expect(
      adapter.validateWithStock({
        ...validateData,
        items: [
          ...validateData.items,
          { inputId: 'input-9', validatedQuantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);

    expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
  });

  it('fails without writing anything when the decision validates the same input twice', async () => {
    await expect(
      adapter.validateWithStock({
        ...validateData,
        items: [
          { inputId: 'input-1', validatedQuantity: 12 },
          { inputId: 'input-1', validatedQuantity: 13 },
          { inputId: 'input-2', validatedQuantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);

    expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
  });

  it('fails without touching stock when the reception is not visible for the client', async () => {
    tx.reception.findFirst.mockResolvedValue(null);

    await expect(adapter.validateWithStock(validateData)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );

    expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.reception.updateMany).not.toHaveBeenCalled();
  });

  it('fails without touching stock when the reception was already decided', async () => {
    tx.reception.findFirst.mockResolvedValue({
      ...pendingReception,
      status: 'VALIDADA',
    });

    await expect(adapter.validateWithStock(validateData)).rejects.toBeInstanceOf(
      InvalidStateTransitionError,
    );

    expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.reception.updateMany).not.toHaveBeenCalled();
  });

  it('fails without touching stock when a concurrent validation wins the guarded status write', async () => {
    tx.reception.updateMany.mockResolvedValue({ count: 0 });

    await expect(adapter.validateWithStock(validateData)).rejects.toBeInstanceOf(
      InvalidStateTransitionError,
    );

    expect(tx.reception.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('fails when a reception item disappears before its guarded validated quantity write', async () => {
    tx.receptionItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(adapter.validateWithStock(validateData)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );

    expect(tx.stock.upsert).not.toHaveBeenCalled();
  });

  describe('reject', () => {
    const rejectData: RejectReceptionData = {
      id: 'reception-1',
      clientId: 'client-1',
      rejectionReason: 'cantidad distinta',
    };

    beforeEach(() => {
      tx.reception.findFirstOrThrow.mockResolvedValue({
        ...pendingReception,
        status: 'RECHAZADA',
        rejectionReason: 'cantidad distinta',
      });
    });

    it('records the rejection with its reason and never moves stock', async () => {
      const record = await adapter.reject(rejectData);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.reception.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'reception-1',
          clientId: 'client-1',
          status: 'PENDIENTE_VALIDACION',
        },
        data: { status: 'RECHAZADA', rejectionReason: 'cantidad distinta' },
      });
      expect(tx.receptionItem.updateMany).not.toHaveBeenCalled();
      expect(tx.stock.upsert).not.toHaveBeenCalled();
      expect(tx.stock.updateMany).not.toHaveBeenCalled();
      expect(record.items.every((item) => item.validatedQuantity === null)).toBe(
        true,
      );
      expect(record).toEqual({
        ...pendingReception,
        status: 'RECHAZADA',
        rejectionReason: 'cantidad distinta',
        photos: [],
        items: pendingReception.items.map((item) => ({
          id: item.id,
          receptionId: item.receptionId,
          inputId: item.inputId,
          quantity: item.quantity,
          validatedQuantity: item.validatedQuantity,
          quantityVariance: null,
          inputName: item.input?.name,
          unit: item.unit,
        })),
      });
    });

    it('fails when the reception is not visible for the client', async () => {
      tx.reception.findFirst.mockResolvedValue(null);

      await expect(adapter.reject(rejectData)).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(tx.reception.updateMany).not.toHaveBeenCalled();
    });

    it('fails when the reception was already decided', async () => {
      tx.reception.findFirst.mockResolvedValue({
        ...pendingReception,
        status: 'RECHAZADA',
      });

      await expect(adapter.reject(rejectData)).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );

      expect(tx.reception.updateMany).not.toHaveBeenCalled();
    });

    it('fails when a concurrent decision wins the guarded status write', async () => {
      tx.reception.updateMany.mockResolvedValue({ count: 0 });

      await expect(adapter.reject(rejectData)).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );

      expect(tx.reception.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });
});
