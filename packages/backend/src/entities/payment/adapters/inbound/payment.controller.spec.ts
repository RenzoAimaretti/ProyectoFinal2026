import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { FindPaymentUseCase } from '../../application/use-cases/find-payment.use-case';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.use-case';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { PaymentController } from './payment.controller';

const req = { user: { firmaId: 'firm', tenantId: 'tenant' } };
const body = {
  clientId: 'client',
  kind: 'INFORMAL' as const,
  method: 'EFECTIVO' as const,
  amount: 20,
  date: '2026-11-19',
};

describe('PaymentController', () => {
  it('takes firma and tenant from JWT, scopes reads and maps errors', async () => {
    const create = { execute: jest.fn().mockResolvedValue({ id: 'payment' }) };
    const find = {
      execute: jest
        .fn()
        .mockRejectedValue(new EntityNotFoundError('Payment not found')),
    };
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const controller = new PaymentController(
      create as unknown as CreatePaymentUseCase,
      find as unknown as FindPaymentUseCase,
      list as unknown as ListPaymentsUseCase,
    );
    await controller.create(req, {
      ...body,
      companyId: 'other',
    } as typeof body);
    expect(create.execute).toHaveBeenCalledWith('firm', 'tenant', {
      ...body,
      companyId: 'other',
    });
    await controller.findAll(req, 'INFORMAL');
    expect(list.execute).toHaveBeenCalledWith('firm', 'INFORMAL');
    await expect(controller.findOne('payment', req)).rejects.toThrow(
      NotFoundException,
    );
    expect(find.execute).toHaveBeenCalledWith('payment', 'firm');
    create.execute.mockRejectedValue(new InvalidInputError('bad input'));
    await expect(controller.create(req, body)).rejects.toThrow(
      BadRequestException,
    );
  });
});
