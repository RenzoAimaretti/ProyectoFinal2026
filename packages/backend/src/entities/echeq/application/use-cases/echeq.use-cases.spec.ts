import { EcheqClockPort, EcheqRepositoryPort } from '../echeq.ports';
import { CreateEcheqData, CreateEcheqInput, EcheqRecord } from '../echeq.types';
import { EcheqStatus } from '../../domain/echeq.rules';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { ConciliateEcheqUseCase } from './conciliate-echeq.use-case';
import { CreateEcheqUseCase } from './create-echeq.use-case';
import { FindEcheqUseCase } from './find-echeq.use-case';
import { ListEcheqsUseCase } from './list-echeqs.use-case';
import { ListPendingEcheqsUseCase } from './list-pending-echeqs.use-case';
import { RejectEcheqUseCase } from './reject-echeq.use-case';

const now = new Date('2026-11-18T12:00:00Z');
const input: CreateEcheqInput = {
  code: ' 001 ',
  issuer: ' Issuer ',
  amount: 50,
  direction: 'RECIBIDO',
  dueDate: '2026-11-20',
};

function fixture() {
  const rows: EcheqRecord[] = [];
  let writes = 0;
  const repository: EcheqRepositoryPort = {
    create(data: CreateEcheqData) {
      if (
        rows.some(
          (row) => row.companyId === data.companyId && row.code === data.code,
        )
      )
        return Promise.reject(new DuplicateEntityError('Duplicate eCheq'));
      const row = {
        ...data,
        id: `echeq-${rows.length + 1}`,
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
    changeStatus(id, companyId, from, to, settlementDate, notes) {
      writes += 1;
      const row = rows.find(
        (item) =>
          item.id === id &&
          item.companyId === companyId &&
          item.status === from,
      );
      if (!row) return Promise.resolve(null);
      row.status = to;
      row.settlementDate = settlementDate;
      if (notes !== undefined) row.notes = notes;
      return Promise.resolve(row);
    },
  };
  const clock: EcheqClockPort = { now: () => now };
  return {
    rows,
    repository,
    create: new CreateEcheqUseCase(repository),
    find: new FindEcheqUseCase(repository),
    list: new ListEcheqsUseCase(repository),
    pending: new ListPendingEcheqsUseCase(repository, clock),
    conciliate: new ConciliateEcheqUseCase(repository),
    reject: new RejectEcheqUseCase(repository),
    getWrites: () => writes,
  };
}

describe('Echeq use cases', () => {
  it('creates pending in caller firma without settlement or payment', async () => {
    const { create } = fixture();
    const row = await create.execute('firm', {
      ...input,
      companyId: 'other',
      status: 'DEBITADO',
    } as CreateEcheqInput);
    expect(row).toMatchObject({
      companyId: 'firm',
      code: '001',
      issuer: 'Issuer',
      status: 'PENDIENTE',
      settlementDate: null,
      paymentId: null,
    });
  });

  it('rejects blank code/issuer, invalid direction/date and non-positive amount', async () => {
    const { create } = fixture();
    for (const bad of [
      { code: ' ' },
      { issuer: '\t' },
      { direction: 'UNKNOWN' },
      { dueDate: 'invalid' },
      { amount: 0 },
      { amount: -1 },
      { amount: Number.NaN },
    ])
      await expect(
        create.execute('firm', { ...input, ...bad } as CreateEcheqInput),
      ).rejects.toThrow(InvalidInputError);
  });

  it('refuses paymentId before payments can be resolved within the firma', async () => {
    await expect(
      fixture().create.execute('firm', {
        ...input,
        paymentId: 'other-payment',
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  it('conflicts on repeated code only within the same firma', async () => {
    const { create } = fixture();
    await create.execute('firm', input);
    await expect(create.execute('firm', input)).rejects.toThrow(
      DuplicateEntityError,
    );
    await expect(create.execute('other', input)).resolves.toMatchObject({
      companyId: 'other',
    });
  });

  it.each([
    ['RECIBIDO', 'ACREDITADO'],
    ['EMITIDO', 'DEBITADO'],
  ] as const)(
    'conciliates %s as %s with a settlement date and refuses double conciliation',
    async (direction, target) => {
      const { create, conciliate, getWrites } = fixture();
      const row = await create.execute('firm', { ...input, direction });
      await expect(
        conciliate.execute('firm', row.id, target, '2026-11-19'),
      ).resolves.toMatchObject({
        status: target,
        settlementDate: new Date('2026-11-19'),
      });
      const before = getWrites();
      await expect(
        conciliate.execute('firm', row.id, target, '2026-11-20'),
      ).rejects.toThrow(InvalidStateTransitionError);
      expect(getWrites()).toBe(before);
    },
  );

  it.each([
    ['RECIBIDO', 'DEBITADO'],
    ['EMITIDO', 'ACREDITADO'],
  ] as const)('refuses %s settling as %s', async (direction, wrong) => {
    const { create, conciliate, getWrites } = fixture();
    const row = await create.execute('firm', { ...input, direction });
    await expect(
      conciliate.execute('firm', row.id, wrong, '2026-11-19'),
    ).rejects.toThrow(InvalidStateTransitionError);
    expect(getWrites()).toBe(0);
  });

  it('requires a valid settlement date and rejects rejection through conciliation', async () => {
    const { create, conciliate } = fixture();
    const row = await create.execute('firm', input);
    await expect(
      conciliate.execute('firm', row.id, 'ACREDITADO', 'invalid'),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      conciliate.execute('firm', row.id, 'RECHAZADO', '2026-11-19'),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('rejects without settlement, keeps reason, and refuses later conciliation', async () => {
    const { create, reject, conciliate, getWrites } = fixture();
    const row = await create.execute('firm', input);
    await expect(
      reject.execute('firm', row.id, 'bad signature'),
    ).resolves.toMatchObject({
      status: 'RECHAZADO',
      settlementDate: null,
      notes: 'bad signature',
    });
    const before = getWrites();
    await expect(
      conciliate.execute('firm', row.id, 'ACREDITADO', '2026-11-20'),
    ).rejects.toThrow(InvalidStateTransitionError);
    await expect(reject.execute('firm', row.id)).rejects.toThrow(
      InvalidStateTransitionError,
    );
    expect(getWrites()).toBe(before);
  });

  it('hides another firma by id, listing, pending inbox and writes', async () => {
    const { create, find, list, pending, conciliate, reject } = fixture();
    const row = await create.execute('firm', input);
    await expect(find.execute(row.id, 'other')).rejects.toThrow(
      EntityNotFoundError,
    );
    await expect(
      conciliate.execute('other', row.id, 'ACREDITADO', '2026-11-19'),
    ).rejects.toThrow(EntityNotFoundError);
    await expect(reject.execute('other', row.id)).rejects.toThrow(
      EntityNotFoundError,
    );
    expect(await list.execute('other')).toEqual([]);
    expect(await list.execute('other', 'PENDIENTE')).toEqual([]);
    expect(await pending.execute('other')).toEqual([]);
  });

  it('lists pending by dueDate and flags only strictly past calendar dates', async () => {
    const { create, pending, list, conciliate } = fixture();
    const later = await create.execute('firm', {
      ...input,
      code: 'later',
      dueDate: '2026-11-20',
    });
    const overdue = await create.execute('firm', {
      ...input,
      code: 'past',
      dueDate: '2026-11-17',
    });
    const today = await create.execute('firm', {
      ...input,
      code: 'today',
      dueDate: '2026-11-18',
    });
    await create.execute('other', {
      ...input,
      code: 'foreign',
      dueDate: '2026-11-16',
    });
    await conciliate.execute('firm', later.id, 'ACREDITADO', '2026-11-20');
    expect(
      (await pending.execute('firm')).map(({ id, overdue: late }) => [
        id,
        late,
      ]),
    ).toEqual([
      [overdue.id, true],
      [today.id, false],
    ]);
    expect(
      (await list.execute('firm', 'ACREDITADO')).map(({ id }) => id),
    ).toEqual([later.id]);
    expect(() => list.execute('firm', 'INVALID' as EcheqStatus)).toThrow(
      InvalidInputError,
    );
  });
});
