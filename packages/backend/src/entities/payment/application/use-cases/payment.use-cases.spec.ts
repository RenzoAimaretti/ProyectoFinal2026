import { GetUsdOfficialUseCase } from '../../../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  PaymentInvoiceReaderPort,
  PaymentRepositoryPort,
  PaymentTenantReaderPort,
} from '../payment.ports';
import {
  CreatePaymentData,
  CreatePaymentInput,
  InvoiceScope,
  PaymentRecord,
} from '../payment.types';
import { CreatePaymentUseCase } from './create-payment.use-case';
import { FindPaymentUseCase } from './find-payment.use-case';
import { ListPaymentsUseCase } from './list-payments.use-case';

const now = new Date('2026-11-19T12:00:00Z');
const input: CreatePaymentInput = {
  clientId: 'client',
  kind: 'INFORMAL',
  method: 'EFECTIVO',
  amount: 50,
  date: now.toISOString(),
};

function fixture() {
  const rows: PaymentRecord[] = [];
  const invoices = new Map<string, InvoiceScope & { totalAmount: number }>([
    [
      'firm:invoice',
      { clientId: 'client', status: 'EMITIDA', totalAmount: 100 },
    ],
    [
      'other:foreign',
      { clientId: 'client', status: 'EMITIDA', totalAmount: 50 },
    ],
    [
      'firm:annulled',
      { clientId: 'client', status: 'ANULADA', totalAmount: 50 },
    ],
  ]);
  const reader: PaymentInvoiceReaderPort = {
    findForCompany: (id, company) =>
      Promise.resolve(invoices.get(`${company}:${id}`) ?? null),
  };
  const tenants: PaymentTenantReaderPort = {
    findCompanyTenantId: (id) =>
      Promise.resolve(id === 'outsider' ? 'other-tenant' : 'tenant'),
    findClientTenantId: (id) =>
      Promise.resolve(id === 'foreign-client' ? 'other-tenant' : 'tenant'),
  };
  const repository: PaymentRepositoryPort = {
    createAndSettle(data: CreatePaymentData) {
      const row = {
        ...data,
        id: `payment-${rows.length + 1}`,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(row);
      if (data.invoiceId) {
        const invoice = invoices.get(`${data.companyId}:${data.invoiceId}`);
        if (
          invoice?.status === 'EMITIDA' &&
          rows
            .filter(
              (p) =>
                p.companyId === data.companyId &&
                p.invoiceId === data.invoiceId,
            )
            .reduce((sum, p) => sum + p.amount, 0) >= invoice.totalAmount
        )
          invoice.status = 'COBRADA';
      }
      return Promise.resolve(row);
    },
    findByIdForCompany: (id, companyId) =>
      Promise.resolve(
        rows.find((p) => p.id === id && p.companyId === companyId) ?? null,
      ),
    findAllByCompany: (companyId, kind) =>
      Promise.resolve(
        rows.filter(
          (p) => p.companyId === companyId && (!kind || p.kind === kind),
        ),
      ),
  };
  const rates = {
    execute: jest.fn().mockResolvedValue({
      venta: 1200,
      fechaActualizacion: now.toISOString(),
    }),
  };
  return {
    rows,
    invoices,
    rates,
    create: new CreatePaymentUseCase(
      repository,
      reader,
      tenants,
      rates as unknown as GetUsdOfficialUseCase,
    ),
    find: new FindPaymentUseCase(repository),
    list: new ListPaymentsUseCase(repository),
  };
}

describe('Payment use cases', () => {
  it('rejects mismatched classification and non-positive amounts without writing', async () => {
    const { create, rows } = fixture();
    for (const bad of [
      { kind: 'INFORMAL', invoiceId: 'invoice' },
      { kind: 'FACTURADO' },
      { amount: 0 },
      { amount: -5 },
      { amount: Number.NaN },
    ])
      await expect(
        create.execute('firm', 'tenant', {
          ...input,
          ...bad,
        } as CreatePaymentInput),
      ).rejects.toThrow(InvalidInputError);
    expect(rows).toHaveLength(0);
  });

  it('hides another firma invoice and refuses annulled invoices or another tenant client', async () => {
    const { create } = fixture();
    await expect(
      create.execute('firm', 'tenant', {
        ...input,
        kind: 'FACTURADO',
        invoiceId: 'foreign',
      }),
    ).rejects.toThrow(EntityNotFoundError);
    await expect(
      create.execute('firm', 'tenant', {
        ...input,
        kind: 'FACTURADO',
        invoiceId: 'annulled',
      }),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      create.execute('firm', 'tenant', {
        ...input,
        clientId: 'foreign-client',
      }),
    ).rejects.toThrow(InvalidRelationError);
  });

  it('records the official selling rate and settles only after total payments reach the invoice amount', async () => {
    const { create, invoices } = fixture();
    const first = await create.execute('firm', 'tenant', {
      ...input,
      kind: 'FACTURADO',
      invoiceId: 'invoice',
    });
    expect(first).toMatchObject({
      companyId: 'firm',
      usdRate: 1200,
      usdRateDate: now,
    });
    expect(invoices.get('firm:invoice')?.status).toBe('EMITIDA');
    await create.execute('firm', 'tenant', {
      ...input,
      kind: 'FACTURADO',
      invoiceId: 'invoice',
    });
    expect(invoices.get('firm:invoice')?.status).toBe('COBRADA');
  });

  it('records payment with visible null rate if integration rejects', async () => {
    const { create, rates, rows } = fixture();
    rates.execute.mockRejectedValue(new Error('upstream unavailable'));
    await expect(
      create.execute('firm', 'tenant', input),
    ).resolves.toMatchObject({ usdRate: null, usdRateDate: null });
    expect(rows).toHaveLength(1);
  });

  it('drops a stale cached quote instead of persisting the previous day rate', async () => {
    const { create, rates, rows } = fixture();
    rates.execute.mockResolvedValue({
      source: 'dolarapi.com',
      casa: 'oficial',
      moneda: 'USD',
      nombre: 'Oficial',
      compra: 1000,
      venta: 1050,
      fechaActualizacion: '2026-11-16T18:00:00.000Z',
      stale: true,
    });
    await expect(
      create.execute('firm', 'tenant', input),
    ).resolves.toMatchObject({ usdRate: null, usdRateDate: null });
    expect(rows).toHaveLength(1);
  });

  it('isolates find and kind-filtered listings by firma', async () => {
    const { create, find, list } = fixture();
    const row = await create.execute('firm', 'tenant', input);
    await create.execute('firm', 'tenant', {
      ...input,
      kind: 'FACTURADO',
      invoiceId: 'invoice',
    });
    await create.execute('other', 'tenant', input);
    await expect(find.execute(row.id, 'other')).rejects.toThrow(
      EntityNotFoundError,
    );
    expect(await list.execute('other')).toHaveLength(1);
    expect((await list.execute('firm', 'INFORMAL')).map((p) => p.id)).toEqual([
      row.id,
    ]);
    await expect(list.execute('firm', 'WRONG' as 'INFORMAL')).rejects.toThrow(
      InvalidInputError,
    );
  });
});
