import { ChequeRepositoryPort } from '../cheque.ports';
import {
  ChequeRecord,
  CreateChequeData,
  CreateChequeInput,
} from '../cheque.types';
import { ChangeChequeStatusUseCase } from './change-cheque-status.use-case';
import { CreateChequeUseCase } from './create-cheque.use-case';
import { FindChequeUseCase } from './find-cheque.use-case';
import { ListChequesUseCase } from './list-cheques.use-case';
import { ChequeStatus } from '../../domain/cheque-status';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidStateTransitionError,
} from '../../domain/errors';

const now = new Date('2026-11-17T12:00:00Z');
const input: CreateChequeInput = {
  number: ' 001 ',
  issuer: ' Issuer ',
  dueDate: '2026-12-01',
  amount: 50,
};

function fixture() {
  const rows: ChequeRecord[] = [];
  let writes = 0;
  const repository: ChequeRepositoryPort = {
    create(data: CreateChequeData) {
      if (
        rows.some(
          (row) =>
            row.companyId === data.companyId &&
            row.number === data.number &&
            row.issuer === data.issuer,
        )
      ) {
        return Promise.reject(new DuplicateEntityError('Duplicate cheque'));
      }
      const row: ChequeRecord = {
        ...data,
        id: `cheque-${rows.length + 1}`,
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(row);
      return Promise.resolve(row);
    },
    findByIdForCompany(id, companyId) {
      return Promise.resolve(
        rows.find((row) => row.id === id && row.companyId === companyId) ??
          null,
      );
    },
    findAllByCompany(companyId, status) {
      return Promise.resolve(
        rows.filter(
          (row) =>
            row.companyId === companyId && (!status || row.status === status),
        ),
      );
    },
    changeStatus(id, companyId, from, to) {
      writes += 1;
      const row = rows.find(
        (item) =>
          item.id === id &&
          item.companyId === companyId &&
          item.status === from,
      );
      if (!row) return Promise.resolve(null);
      row.status = to;
      return Promise.resolve(row);
    },
  };
  return {
    rows,
    repository,
    create: new CreateChequeUseCase(repository),
    find: new FindChequeUseCase(repository),
    list: new ListChequesUseCase(repository),
    change: new ChangeChequeStatusUseCase(repository),
    getWrites: () => writes,
  };
}

describe('Cheque use cases', () => {
  it('creates in the caller firma with trimmed identifiers and initial status', async () => {
    const { create } = fixture();
    const row = await create.execute('firm', {
      ...input,
      companyId: 'other',
      status: 'COBRADO',
    } as CreateChequeInput);
    expect(row).toMatchObject({
      companyId: 'firm',
      number: '001',
      issuer: 'Issuer',
      status: 'EN_CARTERA',
      amount: 50,
    });
    expect(row.dueDate).toEqual(new Date('2026-12-01'));
  });

  it('rejects blank number or issuer, invalid due date and non-positive amount', async () => {
    const { create } = fixture();
    for (const bad of [
      { number: '  ' },
      { issuer: '\t' },
      { dueDate: 'invalid' },
      { amount: 0 },
      { amount: -1 },
      { amount: Number.NaN },
    ]) {
      await expect(
        create.execute('firm', { ...input, ...bad }),
      ).rejects.toThrow(InvalidInputError);
    }
  });

  it('refuses linking a payment until payments are resolved within the firma', async () => {
    const { create } = fixture();
    await expect(
      create.execute('firm', {
        ...input,
        paymentId: 'payment-of-another-firma',
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  it('reports duplicate number and issuer only in the same firma', async () => {
    const { create } = fixture();
    await create.execute('firm', input);
    await expect(create.execute('firm', input)).rejects.toThrow(
      DuplicateEntityError,
    );
    await expect(create.execute('other', input)).resolves.toMatchObject({
      companyId: 'other',
    });
  });

  it.each<[ChequeStatus, ChequeStatus, ChequeStatus[]]>([
    ['EN_CARTERA', 'DEPOSITADO', []],
    ['EN_CARTERA', 'ENDOSADO', []],
    ['EN_CARTERA', 'RECHAZADO', []],
    ['DEPOSITADO', 'COBRADO', ['DEPOSITADO']],
    ['DEPOSITADO', 'RECHAZADO', ['DEPOSITADO']],
  ])('allows %s -> %s', async (_from, target, steps) => {
    const { create, change } = fixture();
    const cheque = await create.execute('firm', input);
    for (const status of steps) await change.execute('firm', cheque.id, status);
    await expect(
      change.execute('firm', cheque.id, target),
    ).resolves.toMatchObject({ status: target });
  });

  it.each<ChequeStatus>(['COBRADO', 'RECHAZADO', 'ENDOSADO'])(
    'refuses a transition from terminal %s without writing',
    async (terminal) => {
      const { create, change, getWrites } = fixture();
      const row = await create.execute('firm', input);
      if (terminal === 'COBRADO')
        await change.execute('firm', row.id, 'DEPOSITADO');
      await change.execute('firm', row.id, terminal);
      const before = getWrites();
      await expect(
        change.execute('firm', row.id, 'DEPOSITADO'),
      ).rejects.toThrow(InvalidStateTransitionError);
      expect(getWrites()).toBe(before);
    },
  );

  it('refuses skipping deposit and invalid targets before writing', async () => {
    const { create, change, getWrites } = fixture();
    const row = await create.execute('firm', input);
    await expect(change.execute('firm', row.id, 'COBRADO')).rejects.toThrow(
      InvalidStateTransitionError,
    );
    await expect(
      change.execute('firm', row.id, 'UNKNOWN' as ChequeStatus),
    ).rejects.toThrow(InvalidInputError);
    expect(getWrites()).toBe(0);
  });

  it('does not reveal another firma cheque on find, update or filtered listing', async () => {
    const { create, find, list, change } = fixture();
    const row = await create.execute('firm', input);
    await expect(find.execute(row.id, 'other')).rejects.toThrow(
      EntityNotFoundError,
    );
    await expect(change.execute('other', row.id, 'DEPOSITADO')).rejects.toThrow(
      EntityNotFoundError,
    );
    expect(await list.execute('other')).toEqual([]);
    expect((await find.execute(row.id, 'firm')).status).toBe('EN_CARTERA');
  });

  it('filters listings by status only within the caller firma', async () => {
    const { create, change, list } = fixture();
    const row = await create.execute('firm', input);
    await create.execute('firm', { ...input, number: '002' });
    await create.execute('other', input);
    await change.execute('firm', row.id, 'DEPOSITADO');
    expect(
      (await list.execute('firm', 'DEPOSITADO')).map((item) => item.id),
    ).toEqual([row.id]);
    expect(await list.execute('other', 'DEPOSITADO')).toEqual([]);
    await expect(list.execute('firm', 'WRONG' as ChequeStatus)).rejects.toThrow(
      InvalidInputError,
    );
  });
});
