import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ListEntityPhotosUseCase } from '../../../photo/application/use-cases/list-entity-photos.use-case';
import {
  CreateDailyReportInput,
  CreateDailyReportItemInput,
  DailyReportRecord,
} from '../../application/daily-report.types';
import { ApproveDailyReportUseCase } from '../../application/use-cases/approve-daily-report.use-case';
import { CreateDailyReportUseCase } from '../../application/use-cases/create-daily-report.use-case';
import { FindDailyReportUseCase } from '../../application/use-cases/find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from '../../application/use-cases/find-daily-reports-by-company.use-case';
import { RejectDailyReportUseCase } from '../../application/use-cases/reject-daily-report.use-case';
import {
  EntityNotFoundError,
  InsufficientStockError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { DailyReportController } from './daily-report.controller';

const mockUser = {
  id: 'operator-1',
  tenantId: 'tenant-1',
  firmaId: 'company-1',
};

const mockReport: DailyReportRecord = {
  id: 'report-1',
  operatorId: 'operator-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      dailyReportId: 'report-1',
      inputId: 'input-1',
      quantity: 10,
      unit: 'L',
    },
  ],
};

const validBody = {
  taskId: 'task-1',
  date: '2026-03-01T00:00:00.000Z',
  hectares: 12.5,
  hours: 6,
  items: [
    { inputId: 'input-1', quantity: 10, unit: 'L' },
  ] as CreateDailyReportItemInput[],
};

describe('DailyReportController', () => {
  let controller: DailyReportController;
  let createDailyReport: jest.Mocked<CreateDailyReportUseCase>;
  let findDailyReport: jest.Mocked<FindDailyReportUseCase>;
  let findByCompany: jest.Mocked<FindDailyReportsByCompanyUseCase>;
  let approveDailyReport: jest.Mocked<ApproveDailyReportUseCase>;
  let rejectDailyReport: jest.Mocked<RejectDailyReportUseCase>;
  let listEntityPhotos: jest.Mocked<ListEntityPhotosUseCase>;

  beforeEach(() => {
    createDailyReport = { execute: jest.fn() } as unknown as jest.Mocked<CreateDailyReportUseCase>;
    findDailyReport = { execute: jest.fn() } as unknown as jest.Mocked<FindDailyReportUseCase>;
    findByCompany = { execute: jest.fn() } as unknown as jest.Mocked<FindDailyReportsByCompanyUseCase>;
    approveDailyReport = { execute: jest.fn() } as unknown as jest.Mocked<ApproveDailyReportUseCase>;
    rejectDailyReport = { execute: jest.fn() } as unknown as jest.Mocked<RejectDailyReportUseCase>;
    listEntityPhotos = { execute: jest.fn() } as unknown as jest.Mocked<ListEntityPhotosUseCase>;

    controller = new DailyReportController(
      createDailyReport,
      findDailyReport,
      findByCompany,
      approveDailyReport,
      rejectDailyReport,
      listEntityPhotos,
    );
  });

  describe('POST /daily-reports', () => {
    it('maps companyId from firmaId and operatorId from user.id, ignoring extras from the body', async () => {
      createDailyReport.execute.mockResolvedValue(mockReport);

      const bodyWithExtras = {
        ...validBody,
        lotId: 'malicious-lot',
        taskTypeId: 'bad-type',
        companyId: 'hijacked',
        operatorId: 'stolen',
      };
      await expect(
        controller.create({ user: mockUser } as never, bodyWithExtras),
      ).resolves.toEqual(mockReport);

      expect(createDailyReport.execute).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          operatorId: 'operator-1',
          taskId: 'task-1',
          date: '2026-03-01T00:00:00.000Z',
          hectares: 12.5,
          hours: 6,
          items: [{ inputId: 'input-1', quantity: 10, unit: 'L' }],
        } as CreateDailyReportInput),
      );

      const callInput = createDailyReport.execute.mock
        .calls[0][1] as CreateDailyReportInput;
      expect(callInput).not.toHaveProperty('lotId');
      expect(callInput).not.toHaveProperty('taskTypeId');
      expect(callInput).not.toHaveProperty('companyId');
    });

    it('passes an optional client id through to the use case', async () => {
      createDailyReport.execute.mockResolvedValue({
        ...mockReport,
        id: 'client-uuid',
      });

      await controller.create(
        { user: mockUser } as never,
        { ...validBody, id: 'client-uuid' },
      );

      expect(createDailyReport.execute).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ id: 'client-uuid' }),
      );
    });

    it('omits id from the input when the body does not include it', async () => {
      createDailyReport.execute.mockResolvedValue(mockReport);

      await controller.create({ user: mockUser } as never, validBody);

      const callInput = createDailyReport.execute.mock
        .calls[0][1] as CreateDailyReportInput;
      expect(callInput.id).toBeUndefined();
    });

    it('translates EntityNotFoundError to 404 NotFoundException', async () => {
      createDailyReport.execute.mockRejectedValue(
        new EntityNotFoundError('Task with id task-1 not found'),
      );

      await expect(
        controller.create({ user: mockUser } as never, validBody),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.create({ user: mockUser } as never, validBody),
      ).rejects.toThrow('Task with id task-1 not found');
    });

    it('translates InvalidInputError to 400 BadRequestException', async () => {
      createDailyReport.execute.mockRejectedValue(
        new InvalidInputError('items must contain at least one input'),
      );

      await expect(
        controller.create({ user: mockUser } as never, validBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('translates InvalidRelationError to 400 BadRequestException', async () => {
      createDailyReport.execute.mockRejectedValue(
        new InvalidRelationError(
          'The referenced task must belong to the same tenant as the company',
        ),
      );

      await expect(
        controller.create({ user: mockUser } as never, validBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('rethrows unexpected errors unchanged', async () => {
      const dbError = new Error('connection lost');
      createDailyReport.execute.mockRejectedValue(dbError);

      await expect(
        controller.create({ user: mockUser } as never, validBody),
      ).rejects.toThrow(dbError);
    });
  });

  describe('GET /daily-reports', () => {
    it('returns the reports of the company scoped from firmaId', async () => {
      findByCompany.execute.mockResolvedValue([mockReport]);

      await expect(
        controller.findAllByCompany({ user: mockUser } as never),
      ).resolves.toEqual([mockReport]);

      expect(findByCompany.execute).toHaveBeenCalledWith('company-1');
    });
  });

  describe('GET /daily-reports/:id', () => {
    it('returns the report scoped to the caller firm', async () => {
      findDailyReport.execute.mockResolvedValue(mockReport);

      await expect(
        controller.findOne('report-1', { user: mockUser } as never),
      ).resolves.toEqual(mockReport);

      expect(findDailyReport.execute).toHaveBeenCalledWith(
        'report-1',
        'company-1',
      );
    });

    it('translates EntityNotFoundError to 404 NotFoundException', async () => {
      findDailyReport.execute.mockRejectedValue(
        new EntityNotFoundError('Daily report with id report-1 not found'),
      );

      await expect(
        controller.findOne('report-1', { user: mockUser } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('translates InvalidInputError to 400 BadRequestException', async () => {
      findDailyReport.execute.mockRejectedValue(
        new InvalidInputError('id is required'),
      );

      await expect(
        controller.findOne('', { user: mockUser } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rethrows unexpected errors unchanged', async () => {
      const dbError = new Error('connection lost');
      findDailyReport.execute.mockRejectedValue(dbError);

      await expect(
        controller.findOne('report-1', { user: mockUser } as never),
      ).rejects.toThrow(dbError);
    });
  });

  describe('POST /daily-reports/:id/approve', () => {
    it('approves with the company from firmaId and the approver from user.id', async () => {
      const approved: DailyReportRecord = {
        ...mockReport,
        status: 'APROBADO',
        approvedBy: 'operator-1',
        approvedAt: new Date('2026-05-04T12:00:00.000Z'),
      };
      approveDailyReport.execute.mockResolvedValue(approved);

      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).resolves.toEqual(approved);

      expect(approveDailyReport.execute).toHaveBeenCalledWith(
        'company-1',
        'report-1',
        'operator-1',
      );
    });

    it('translates EntityNotFoundError to 404 NotFoundException', async () => {
      approveDailyReport.execute.mockRejectedValue(
        new EntityNotFoundError('Daily report with id report-1 not found'),
      );

      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('translates InvalidStateTransitionError to 409 ConflictException', async () => {
      approveDailyReport.execute.mockRejectedValue(
        new InvalidStateTransitionError('already decided'),
      );

      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('translates InvalidInputError and InvalidRelationError to 400', async () => {
      approveDailyReport.execute.mockRejectedValue(
        new InvalidInputError('companyId is required'),
      );
      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toThrow(BadRequestException);

      approveDailyReport.execute.mockRejectedValue(
        new InvalidRelationError('lot is not linked to a client'),
      );
      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps InsufficientStockError to a 409 body with the stock detail', async () => {
      approveDailyReport.execute.mockRejectedValue(
        new InsufficientStockError('client-1', 'input-1', 10, 4),
      );

      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toMatchObject({
        response: {
          statusCode: 409,
          code: 'INSUFFICIENT_STOCK',
          message: expect.any(String),
          clientId: 'client-1',
          inputId: 'input-1',
          required: 10,
          available: 4,
        },
      });
    });

    it('rethrows unexpected errors unchanged', async () => {
      const dbError = new Error('connection lost');
      approveDailyReport.execute.mockRejectedValue(dbError);

      await expect(
        controller.approve('report-1', { user: mockUser } as never),
      ).rejects.toThrow(dbError);
    });
  });

  describe('POST /daily-reports/:id/reject', () => {
    it('rejects with the company from firmaId and the provided reason', async () => {
      const rejected: DailyReportRecord = {
        ...mockReport,
        status: 'RECHAZADO',
        rejectionReason: 'fuera de fecha',
      };
      rejectDailyReport.execute.mockResolvedValue(rejected);

      await expect(
        controller.reject(
          'report-1',
          { user: mockUser } as never,
          { reason: 'fuera de fecha' },
        ),
      ).resolves.toEqual(rejected);

      expect(rejectDailyReport.execute).toHaveBeenCalledWith(
        'company-1',
        'report-1',
        'fuera de fecha',
      );
    });

    it('passes an undefined reason when the body is empty so the use case rejects it', async () => {
      rejectDailyReport.execute.mockRejectedValue(
        new InvalidInputError('rejectionReason is required'),
      );

      await expect(
        controller.reject('report-1', { user: mockUser } as never, {}),
      ).rejects.toThrow(BadRequestException);

      expect(rejectDailyReport.execute).toHaveBeenCalledWith(
        'company-1',
        'report-1',
        undefined,
      );
    });

    it('translates EntityNotFoundError to 404 and InvalidStateTransitionError to 409', async () => {
      rejectDailyReport.execute.mockRejectedValue(
        new EntityNotFoundError('Daily report with id report-1 not found'),
      );
      await expect(
        controller.reject('report-1', { user: mockUser } as never, {
          reason: 'motivo',
        }),
      ).rejects.toThrow(NotFoundException);

      rejectDailyReport.execute.mockRejectedValue(
        new InvalidStateTransitionError('already decided'),
      );
      await expect(
        controller.reject('report-1', { user: mockUser } as never, {
          reason: 'motivo',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('GET /daily-reports/:id/photos', () => {
    it('checks the report belongs to the company and then lists its album', async () => {
      const photos = [
        {
          id: 'photo-1',
          entityType: 'PARTE_DIARIO' as const,
          entityId: 'report-1',
          localPath: '/photos/report-1/1.jpg',
          orderIndex: 0,
          createdAt: new Date('2026-03-01T10:00:00.000Z'),
        },
      ];
      findDailyReport.execute.mockResolvedValue(mockReport);
      listEntityPhotos.execute.mockResolvedValue(photos);

      await expect(
        controller.findPhotos('report-1', { user: mockUser } as never),
      ).resolves.toEqual(photos);

      expect(findDailyReport.execute).toHaveBeenCalledWith(
        'report-1',
        'company-1',
      );
      expect(listEntityPhotos.execute).toHaveBeenCalledWith(
        'PARTE_DIARIO',
        'report-1',
      );
    });

    it('returns 404 and never reads the album when the report is out of scope', async () => {
      findDailyReport.execute.mockRejectedValue(
        new EntityNotFoundError('Daily report with id report-9 not found'),
      );

      await expect(
        controller.findPhotos('report-9', { user: mockUser } as never),
      ).rejects.toThrow(NotFoundException);

      expect(listEntityPhotos.execute).not.toHaveBeenCalled();
    });
  });
});
