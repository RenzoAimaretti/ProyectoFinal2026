import {
  CreateReceptionData,
  ReceptionRecord,
} from '../../application/reception.types';
import { PrismaReceptionRepository } from './prisma-reception.repository';

const persistedReception = {
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
    },
    {
      id: 'item-2',
      receptionId: 'reception-1',
      inputId: 'input-2',
      quantity: 4,
      validatedQuantity: null,
      unit: 'kg',
    },
  ],
};

const expectedRecord: ReceptionRecord = {
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
      quantityVariance: null,
      unit: 'L',
    },
    {
      id: 'item-2',
      receptionId: 'reception-1',
      inputId: 'input-2',
      quantity: 4,
      validatedQuantity: null,
      quantityVariance: null,
      unit: 'kg',
    },
  ],
};

const expectedInclude = {
  client: { select: { name: true } },
  items: {
    orderBy: [{ id: 'asc' }],
    include: { input: { select: { name: true } } },
  },
};

describe('PrismaReceptionRepository', () => {
  const prisma = {
    reception: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const repository = new PrismaReceptionRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the reception header and its items as pending, without a validated quantity', async () => {
    const data: CreateReceptionData = {
      clientId: 'client-1',
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'PENDIENTE_VALIDACION',
      items: [
        { inputId: 'input-1', quantity: 10, unit: 'L' },
        { inputId: 'input-2', quantity: 4, unit: 'kg' },
      ],
    };
    prisma.reception.create.mockResolvedValue(persistedReception);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.reception.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        date: new Date('2026-04-01T00:00:00.000Z'),
        status: 'PENDIENTE_VALIDACION',
        items: {
          create: [
            { inputId: 'input-1', quantity: 10, unit: 'L' },
            { inputId: 'input-2', quantity: 4, unit: 'kg' },
          ],
        },
      },
      include: expectedInclude,
    });
  });

  it('scopes the reception read directly by client id', async () => {
    prisma.reception.findFirst.mockResolvedValue(persistedReception);

    await expect(
      repository.findByIdForClient('reception-1', 'client-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.reception.findFirst).toHaveBeenCalledWith({
      where: { id: 'reception-1', clientId: 'client-1' },
      include: expectedInclude,
    });
  });

  it('returns null when the reception belongs to another client', async () => {
    prisma.reception.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForClient('reception-1', 'client-2'),
    ).resolves.toBeNull();
  });

  it('lists the receptions of a client with a deterministic order', async () => {
    prisma.reception.findMany.mockResolvedValue([persistedReception]);

    await expect(repository.findAllByClient('client-1')).resolves.toEqual([
      expectedRecord,
    ]);

    expect(prisma.reception.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      include: expectedInclude,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the client owns no reception', async () => {
    prisma.reception.findMany.mockResolvedValue([]);

    await expect(repository.findAllByClient('client-2')).resolves.toEqual([]);
  });

  it('lists every reception of the tenant through the client relation', async () => {
    prisma.reception.findMany.mockResolvedValue([persistedReception]);

    await expect(repository.findAllByTenant('tenant-1')).resolves.toEqual([
      expectedRecord,
    ]);

    expect(prisma.reception.findMany).toHaveBeenCalledWith({
      where: { client: { tenantId: 'tenant-1' } },
      include: expectedInclude,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('reads a single reception scoped to the tenant through the client relation', async () => {
    prisma.reception.findFirst.mockResolvedValue(persistedReception);

    await expect(
      repository.findByIdForTenant('reception-1', 'tenant-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.reception.findFirst).toHaveBeenCalledWith({
      where: { id: 'reception-1', client: { tenantId: 'tenant-1' } },
      include: expectedInclude,
    });
  });

  it('returns null when the reception is outside the tenant', async () => {
    prisma.reception.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForTenant('reception-1', 'tenant-2'),
    ).resolves.toBeNull();
  });
});
