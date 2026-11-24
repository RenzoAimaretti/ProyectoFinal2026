import { CreateInvoiceUseCase } from './create-invoice.use-case';
import { FindInvoiceUseCase } from './find-invoice.use-case';
import { ListInvoicesUseCase } from './list-invoices.use-case';
import {
  InvoiceClientReaderPort,
  InvoiceCompanyReaderPort,
  InvoiceRepositoryPort,
  InvoiceTaskReaderPort,
} from '../invoice.ports';
import {
  CreateInvoiceData,
  CreateInvoiceInput,
  InvoiceRecord,
} from '../invoice.types';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';

const now = new Date('2026-11-17T12:00:00Z');
const input: CreateInvoiceInput = {
  clientId: 'client',
  number: 'F-001',
  items: [
    { description: ' Work ', quantity: 2, unitPrice: 15, taskId: 'task' },
  ],
};
function fixture() {
  const rows: InvoiceRecord[] = [];
  const repository: InvoiceRepositoryPort = {
    create(data: CreateInvoiceData) {
      const row: InvoiceRecord = {
        ...data,
        id: 'invoice',
        usdRate: null,
        usdRateDate: null,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
        items: data.items.map((item, index) => ({
          ...item,
          taskId: item.taskId ?? null,
          id: String(index),
          invoiceId: 'invoice',
        })),
      };
      rows.push(row);
      return Promise.resolve(row);
    },
    findByIdForCompany(id, companyId) {
      return Promise.resolve(
        rows.find(
          (row) => row.id === id && row.companyId === companyId && !row.deleted,
        ) ?? null,
      );
    },
    findAllByCompany(companyId) {
      return Promise.resolve(
        rows.filter((row) => row.companyId === companyId && !row.deleted),
      );
    },
  };
  const companies: InvoiceCompanyReaderPort = {
    findTenantId: (id) => Promise.resolve(id === 'firm' ? 'tenant' : null),
  };
  const clients: InvoiceClientReaderPort = {
    findTenantId: (id) => Promise.resolve(id === 'client' ? 'tenant' : null),
  };
  const tasks: InvoiceTaskReaderPort = {
    findClientScope: (id) =>
      Promise.resolve(
        id === 'task'
          ? { clientId: 'client', tenantId: 'tenant' }
          : { clientId: 'other', tenantId: 'tenant' },
      ),
  };
  return {
    rows,
    repository,
    create: new CreateInvoiceUseCase(repository, companies, clients, tasks, {
      now: () => now,
    }),
  };
}
describe('Invoice use cases', () => {
  it('computes item amounts and total, ignoring any supplied total', async () => {
    const { create } = fixture();
    const row = await create.execute('firm', 'tenant', {
      ...input,
      totalAmount: 999,
    } as CreateInvoiceInput);
    expect(row.totalAmount).toBe(30);
    expect(row.items[0]).toMatchObject({ description: 'Work', amount: 30 });
    expect(row.status).toBe('EMITIDA');
    expect(row.issueDate).toEqual(now);
  });
  it('rejects empty items, invalid quantity and unit price', async () => {
    const { create } = fixture();
    for (const items of [
      [],
      [{ description: 'x', quantity: 0, unitPrice: 2 }],
      [{ description: 'x', quantity: 1, unitPrice: -2 }],
      [{ description: ' ', quantity: 1, unitPrice: 2 }],
    ]) {
      await expect(
        create.execute('firm', 'tenant', { ...input, items }),
      ).rejects.toThrow(InvalidInputError);
    }
  });
  it('rejects cross-client and cross-tenant references', async () => {
    const { create } = fixture();
    await expect(
      create.execute('firm', 'tenant', {
        ...input,
        items: [{ ...input.items[0], taskId: 'other' }],
      }),
    ).rejects.toThrow(InvalidRelationError);
    await expect(create.execute('firm', 'other-tenant', input)).rejects.toThrow(
      InvalidRelationError,
    );
  });
  it('accepts a line with no taskId', async () => {
    const { create } = fixture();
    const result = await create.execute('firm', 'tenant', {
      ...input,
      items: [{ description: 'Freight', quantity: 1, unitPrice: 5 }],
    });
    expect(result.items[0].taskId).toBeNull();
  });
  it('does not expose another firm invoice by id or in lists', async () => {
    const { create, repository } = fixture();
    await create.execute('firm', 'tenant', input);
    await expect(
      new FindInvoiceUseCase(repository).execute('invoice', 'other-firm'),
    ).rejects.toThrow(EntityNotFoundError);
    expect(
      await new ListInvoicesUseCase(repository).execute('other-firm'),
    ).toEqual([]);
  });
});
