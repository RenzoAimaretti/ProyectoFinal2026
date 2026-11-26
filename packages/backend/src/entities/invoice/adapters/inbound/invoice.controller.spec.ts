import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { InvoiceController } from './invoice.controller';
import { CreateInvoiceUseCase } from '../../application/use-cases/create-invoice.use-case';
import { FindInvoiceUseCase } from '../../application/use-cases/find-invoice.use-case';
import { ListInvoicesUseCase } from '../../application/use-cases/list-invoices.use-case';
import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';

describe('InvoiceController', () => {
  const create = { execute: jest.fn() };
  const find = { execute: jest.fn() };
  const list = { execute: jest.fn() };
  const controller = new InvoiceController(
    create as unknown as CreateInvoiceUseCase,
    find as unknown as FindInvoiceUseCase,
    list as unknown as ListInvoicesUseCase,
  );
  const request = { user: { firmaId: 'firm', tenantId: 'tenant' } };
  beforeEach(() => jest.resetAllMocks());

  it('takes the firm and tenant from JWT rather than the body', async () => {
    const body = {
      companyId: 'foreign',
      clientId: 'client',
      number: '1',
      items: [],
    };
    await controller.create(request, body);
    expect(create.execute).toHaveBeenCalledWith('firm', 'tenant', body);
    await controller.findAll(request);
    expect(list.execute).toHaveBeenCalledWith('firm');
    await controller.findOne('id', request);
    expect(find.execute).toHaveBeenCalledWith('id', 'firm');
  });
  it('maps an inaccessible invoice to 404 and invalid references to 400', async () => {
    find.execute.mockRejectedValueOnce(new EntityNotFoundError('not found'));
    await expect(controller.findOne('foreign', request)).rejects.toThrow(
      NotFoundException,
    );
    create.execute.mockRejectedValueOnce(
      new InvalidRelationError('wrong client'),
    );
    await expect(
      controller.create(request, {
        clientId: 'client',
        number: '1',
        items: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('restricts every endpoint to accounting roles', () => {
    for (const method of ['create', 'findOne', 'findAll'] as const) {
      expect(Reflect.getMetadata(ROLES_KEY, controller[method])).toEqual([
        'ADMIN',
        'SUPERVISOR',
      ]);
    }
  });
});
