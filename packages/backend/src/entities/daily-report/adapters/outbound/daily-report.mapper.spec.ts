import { DailyReportRecord } from '../../application/daily-report.types';
import {
  buildDailyReportInclude,
  DailyReportRow,
  toDailyReportRecord,
} from './daily-report.mapper';

const baseRow: DailyReportRow = {
  id: 'report-1',
  operatorId: 'user-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  date: new Date('2026-05-03T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-05-03T10:00:00.000Z'),
  updatedAt: new Date('2026-05-03T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      dailyReportId: 'report-1',
      inputId: 'input-1',
      quantity: 10,
      unit: 'L',
      input: { name: 'Glifosato' },
    },
    {
      id: 'item-2',
      dailyReportId: 'report-1',
      inputId: 'input-2',
      quantity: 4,
      unit: 'kg',
    },
  ],
};

describe('toDailyReportRecord', () => {
  it('maps the joined display names of the report and its items', () => {
    const record = toDailyReportRecord({
      ...baseRow,
      company: { name: 'Firma SA' },
      operator: { username: 'operador', email: 'operador@agro.com' },
      taskType: { name: 'Pulverizacion' },
      task: {
        lot: {
          name: 'Lote 1',
          farm: { name: 'Campo Norte', client: { name: 'Cliente X' } },
        },
      },
      approver: { username: 'admin', email: 'admin@agro.com' },
    });

    expect(record).toMatchObject({
      companyName: 'Firma SA',
      operatorName: 'operador',
      taskTypeName: 'Pulverizacion',
      lotName: 'Lote 1',
      farmName: 'Campo Norte',
      clientName: 'Cliente X',
      approvedByName: 'admin',
    });
    expect(record.items[0].inputName).toBe('Glifosato');
    expect(record.items[1].inputName).toBeUndefined();
  });

  it('falls back to the email when the user has no username', () => {
    const record = toDailyReportRecord({
      ...baseRow,
      operator: { username: null, email: 'operador@agro.com' },
      approver: { username: null, email: 'admin@agro.com' },
    });

    expect(record.operatorName).toBe('operador@agro.com');
    expect(record.approvedByName).toBe('admin@agro.com');
  });

  it('keeps every enriched field optional when a relation is not joined', () => {
    const record: DailyReportRecord = toDailyReportRecord(baseRow);

    expect(record).toEqual({
      id: 'report-1',
      operatorId: 'user-1',
      companyId: 'company-1',
      taskId: 'task-1',
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      date: new Date('2026-05-03T00:00:00.000Z'),
      hectares: 12.5,
      hours: 6,
      status: 'PENDIENTE_APROBACION',
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date('2026-05-03T10:00:00.000Z'),
      updatedAt: new Date('2026-05-03T10:00:00.000Z'),
      items: [
        {
          id: 'item-1',
          dailyReportId: 'report-1',
          inputId: 'input-1',
          quantity: 10,
          unit: 'L',
          inputName: 'Glifosato',
        },
        {
          id: 'item-2',
          dailyReportId: 'report-1',
          inputId: 'input-2',
          quantity: 4,
          unit: 'kg',
        },
      ],
    });
    expect(record.companyName).toBeUndefined();
    expect(record.operatorName).toBeUndefined();
  });
});

describe('buildDailyReportInclude', () => {
  it('joins every relation used to enrich the report', () => {
    expect(buildDailyReportInclude()).toEqual({
      items: {
        orderBy: [{ id: 'asc' }],
        include: { input: { select: { name: true } } },
      },
      company: { select: { name: true } },
      operator: { select: { username: true, email: true } },
      taskType: { select: { name: true } },
      task: {
        select: {
          lot: {
            select: {
              name: true,
              farm: {
                select: {
                  name: true,
                  client: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      approver: { select: { username: true, email: true } },
    });
  });
});
