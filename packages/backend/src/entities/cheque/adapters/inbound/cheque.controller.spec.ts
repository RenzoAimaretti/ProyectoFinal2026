import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ChequeController } from './cheque.controller';
import { CreateChequeUseCase } from '../../application/use-cases/create-cheque.use-case';
import { FindChequeUseCase } from '../../application/use-cases/find-cheque.use-case';
import { ListChequesUseCase } from '../../application/use-cases/list-cheques.use-case';
import { ChangeChequeStatusUseCase } from '../../application/use-cases/change-cheque-status.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidStateTransitionError,
} from '../../domain/errors';

const req = { user: { firmaId: 'firm', tenantId: 'tenant' } };
const body = {
  number: '1',
  issuer: 'issuer',
  dueDate: '2026-12-01',
  amount: 20,
};

describe('ChequeController', () => {
  it('passes only the JWT firma and maps create data', async () => {
    const create = { execute: jest.fn().mockResolvedValue({ id: 'cheque' }) };
    const controller = new ChequeController(
      create as unknown as CreateChequeUseCase,
      {} as FindChequeUseCase,
      {} as ListChequesUseCase,
      {} as ChangeChequeStatusUseCase,
    );
    await controller.create(req, {
      ...body,
      companyId: 'other',
    } as typeof body);
    expect(create.execute).toHaveBeenCalledWith('firm', {
      ...body,
      companyId: 'other',
    });
  });

  it('scopes reads and status changes and translates not found without leaking', async () => {
    const find = {
      execute: jest
        .fn()
        .mockRejectedValue(new EntityNotFoundError('Not found')),
    };
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const change = {
      execute: jest
        .fn()
        .mockRejectedValue(new EntityNotFoundError('Not found')),
    };
    const controller = new ChequeController(
      {} as CreateChequeUseCase,
      find as unknown as FindChequeUseCase,
      list as unknown as ListChequesUseCase,
      change as unknown as ChangeChequeStatusUseCase,
    );
    await expect(controller.findOne('cheque', req)).rejects.toThrow(
      NotFoundException,
    );
    await controller.findAll(req, 'DEPOSITADO');
    await expect(
      controller.changeStatus('cheque', req, { status: 'COBRADO' }),
    ).rejects.toThrow(NotFoundException);
    expect(find.execute).toHaveBeenCalledWith('cheque', 'firm');
    expect(list.execute).toHaveBeenCalledWith('firm', 'DEPOSITADO');
    expect(change.execute).toHaveBeenCalledWith('firm', 'cheque', 'COBRADO');
  });

  it('translates duplicate to conflict and illegal transitions to bad request', async () => {
    const create = {
      execute: jest
        .fn()
        .mockRejectedValue(new DuplicateEntityError('Duplicate')),
    };
    const change = {
      execute: jest
        .fn()
        .mockRejectedValue(new InvalidStateTransitionError('Invalid')),
    };
    const controller = new ChequeController(
      create as unknown as CreateChequeUseCase,
      {} as FindChequeUseCase,
      {} as ListChequesUseCase,
      change as unknown as ChangeChequeStatusUseCase,
    );
    await expect(controller.create(req, body)).rejects.toThrow(
      ConflictException,
    );
    await expect(
      controller.changeStatus('cheque', req, { status: 'COBRADO' }),
    ).rejects.toThrow(BadRequestException);
  });
});
