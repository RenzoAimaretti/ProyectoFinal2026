import { InvalidRelationError } from '../../domain/errors';
import { calculateInvoiceItems } from '../../domain/invoice.rules';
import { INVOICE_INITIAL_STATUS } from '../../domain/invoice-status';
import {
  InvoiceClientReaderPort,
  InvoiceClockPort,
  InvoiceCompanyReaderPort,
  InvoiceRepositoryPort,
  InvoiceTaskReaderPort,
} from '../invoice.ports';
import { CreateInvoiceInput, InvoiceRecord } from '../invoice.types';
import { requiredDate, requiredString } from '../invoice.validation';

export class CreateInvoiceUseCase {
  constructor(
    private readonly repository: InvoiceRepositoryPort,
    private readonly companies: InvoiceCompanyReaderPort,
    private readonly clients: InvoiceClientReaderPort,
    private readonly tasks: InvoiceTaskReaderPort,
    private readonly clock: InvoiceClockPort,
  ) {}

  async execute(
    companyId: string,
    tenantId: string,
    input: CreateInvoiceInput,
  ): Promise<InvoiceRecord> {
    const company = requiredString(companyId, 'companyId');
    const tenant = requiredString(tenantId, 'tenantId');
    const clientId = requiredString(input?.clientId, 'clientId');
    const number = requiredString(input?.number, 'number');
    const issueDate =
      input.issueDate === undefined
        ? this.clock.now()
        : requiredDate(input.issueDate, 'issueDate');
    const dueDate =
      input.dueDate == null ? null : requiredDate(input.dueDate, 'dueDate');
    const { items, totalAmount } = calculateInvoiceItems(input.items);
    for (const [index, item] of items.entries()) {
      if (item.taskId !== undefined)
        requiredString(item.taskId, `items[${index}].taskId`);
    }
    if (
      (await this.companies.findTenantId(company)) !== tenant ||
      (await this.clients.findTenantId(clientId)) !== tenant
    ) {
      throw new InvalidRelationError(
        'Company and client must belong to the caller tenant',
      );
    }
    for (const taskId of new Set(
      items
        .map((item) => item.taskId)
        .filter((id): id is string => id !== undefined),
    )) {
      const scope = await this.tasks.findClientScope(taskId);
      if (!scope || scope.clientId !== clientId || scope.tenantId !== tenant) {
        throw new InvalidRelationError(
          'Referenced tasks must belong to the invoice client',
        );
      }
    }
    // The unique (companyId, number) database constraint arbitrates concurrent creations.
    return this.repository.create({
      companyId: company,
      clientId,
      number,
      issueDate,
      dueDate,
      notes: input.notes ?? null,
      items,
      totalAmount,
      status: INVOICE_INITIAL_STATUS,
    });
  }
}
