import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EcheqController } from './echeq.controller';
import { CreateEcheqUseCase } from '../../application/use-cases/create-echeq.use-case';
import { FindEcheqUseCase } from '../../application/use-cases/find-echeq.use-case';
import { ListEcheqsUseCase } from '../../application/use-cases/list-echeqs.use-case';
import { ListPendingEcheqsUseCase } from '../../application/use-cases/list-pending-echeqs.use-case';
import { ConciliateEcheqUseCase } from '../../application/use-cases/conciliate-echeq.use-case';
import { RejectEcheqUseCase } from '../../application/use-cases/reject-echeq.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';

const req = { user: { firmaId: 'firm', tenantId: 'tenant' } };
const body = {
  code: '1',
  issuer: 'issuer',
  amount: 20,
  direction: 'RECIBIDO' as const,
  dueDate: '2026-12-01',
};
function controller(
  overrides: {
    create?: object;
    find?: object;
    list?: object;
    pending?: object;
    conciliate?: object;
    reject?: object;
  } = {},
) {
  return new EcheqController(
    (overrides.create ?? {}) as CreateEcheqUseCase,
    (overrides.find ?? {}) as FindEcheqUseCase,
    (overrides.list ?? {}) as ListEcheqsUseCase,
    (overrides.pending ?? {}) as ListPendingEcheqsUseCase,
    (overrides.conciliate ?? {}) as ConciliateEcheqUseCase,
    (overrides.reject ?? {}) as RejectEcheqUseCase,
  );
}

describe('EcheqController', () => {
  it('uses the JWT firma for every route', async () => {
    const create = { execute: jest.fn().mockResolvedValue({}) };
    const find = { execute: jest.fn().mockResolvedValue({}) };
    const list = { execute: jest.fn().mockResolvedValue([]) };
    const pending = { execute: jest.fn().mockResolvedValue([]) };
    const conciliate = { execute: jest.fn().mockResolvedValue({}) };
    const reject = { execute: jest.fn().mockResolvedValue({}) };
    const api = controller({ create, find, list, pending, conciliate, reject });
    await api.create(req, body);
    await api.findOne('id', req);
    await api.findAll(req, 'PENDIENTE');
    await api.pending(req);
    await api.conciliate('id', req, {
      status: 'ACREDITADO',
      settlementDate: '2026-11-19',
    });
    await api.reject('id', req, { notes: 'reason' });
    expect(create.execute).toHaveBeenCalledWith('firm', body);
    expect(find.execute).toHaveBeenCalledWith('id', 'firm');
    expect(list.execute).toHaveBeenCalledWith('firm', 'PENDIENTE');
    expect(pending.execute).toHaveBeenCalledWith('firm');
    expect(conciliate.execute).toHaveBeenCalledWith(
      'firm',
      'id',
      'ACREDITADO',
      '2026-11-19',
    );
    expect(reject.execute).toHaveBeenCalledWith('firm', 'id', 'reason');
  });

  it('maps missing to 404, duplicate and invalid transition to 409, input to 400', async () => {
    await expect(
      controller({
        find: {
          execute: jest
            .fn()
            .mockRejectedValue(new EntityNotFoundError('Missing')),
        },
      }).findOne('id', req),
    ).rejects.toThrow(NotFoundException);
    await expect(
      controller({
        create: {
          execute: jest
            .fn()
            .mockRejectedValue(new DuplicateEntityError('Duplicate')),
        },
      }).create(req, body),
    ).rejects.toThrow(ConflictException);
    await expect(
      controller({
        conciliate: {
          execute: jest
            .fn()
            .mockRejectedValue(new InvalidStateTransitionError('Invalid')),
        },
      }).conciliate('id', req, {
        status: 'DEBITADO',
        settlementDate: '2026-11-19',
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      controller({
        create: {
          execute: jest.fn().mockRejectedValue(new InvalidInputError('Bad')),
        },
      }).create(req, body),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller({
        create: {
          execute: jest
            .fn()
            .mockRejectedValue(new EntityNotFoundError('Payment not found')),
        },
      }).create(req, body),
    ).rejects.toThrow(NotFoundException);
    await expect(
      controller({
        create: {
          execute: jest
            .fn()
            .mockRejectedValue(new InvalidRelationError('Wrong method')),
        },
      }).create(req, body),
    ).rejects.toThrow(BadRequestException);
  });
});
