import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { FindReceptionByTenantUseCase } from '../../../reception/application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionUseCase } from '../../../reception/application/use-cases/find-reception.use-case';
import { AttachPhotoFromDataUrlUseCase } from '../../application/use-cases/attach-photo-from-data-url.use-case';
import { ListEntityPhotosUseCase } from '../../application/use-cases/list-entity-photos.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  PhotoLimitExceededError,
} from '../../domain/errors';
import { PhotoController } from './photo.controller';

const mockUser = {
  id: 'admin-1',
  role: 'ADMIN',
  tenantId: 'tenant-1',
};

const photoRecord = {
  id: 'photo-1',
  entityType: 'RECEPCION' as const,
  entityId: 'reception-1',
  localPath: '/uploads/receptions/photo-1.png',
  orderIndex: 0,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
};

const expectedResponse = {
  id: 'photo-1',
  entityType: 'RECEPCION',
  entityId: 'reception-1',
  url: '/uploads/receptions/photo-1.png',
  orderIndex: 0,
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
};

const dataUrl = 'data:image/png;base64,AA==';

describe('PhotoController', () => {
  let controller: PhotoController;
  let attachPhoto: jest.Mocked<AttachPhotoFromDataUrlUseCase>;
  let listPhotos: jest.Mocked<ListEntityPhotosUseCase>;
  let findReception: jest.Mocked<FindReceptionUseCase>;
  let findReceptionByTenant: jest.Mocked<FindReceptionByTenantUseCase>;
  let clientUserReader: { findClientIdByUserId: jest.Mock };

  beforeEach(() => {
    attachPhoto = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AttachPhotoFromDataUrlUseCase>;
    listPhotos = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListEntityPhotosUseCase>;
    findReception = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindReceptionUseCase>;
    findReceptionByTenant = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindReceptionByTenantUseCase>;
    clientUserReader = { findClientIdByUserId: jest.fn() };

    controller = new PhotoController(
      attachPhoto,
      listPhotos,
      findReception,
      findReceptionByTenant,
      clientUserReader as never,
    );
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['attach', 'list'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        PhotoController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  describe('POST /receptions/:id/photos', () => {
    it('scopes an admin to the tenant and returns the photo URL shape', async () => {
      findReceptionByTenant.execute.mockResolvedValue({
        id: 'reception-1',
      } as never);
      attachPhoto.execute.mockResolvedValue(photoRecord);

      await expect(
        controller.attach(
          'reception-1',
          { user: mockUser } as never,
          { dataUrl },
        ),
      ).resolves.toEqual(expectedResponse);

      expect(findReceptionByTenant.execute).toHaveBeenCalledWith(
        'reception-1',
        'tenant-1',
      );
      expect(findReception.execute).not.toHaveBeenCalled();
      expect(attachPhoto.execute).toHaveBeenCalledWith(
        'RECEPCION',
        'reception-1',
        { dataUrl, orderIndex: undefined },
      );
    });

    it('scopes a productor to their own client', async () => {
      clientUserReader.findClientIdByUserId.mockResolvedValue('client-own');
      findReception.execute.mockResolvedValue({ id: 'reception-1' } as never);
      attachPhoto.execute.mockResolvedValue(photoRecord);

      await expect(
        controller.attach(
          'reception-1',
          { user: { ...mockUser, role: 'PRODUCTOR' } } as never,
          { dataUrl },
        ),
      ).resolves.toEqual(expectedResponse);

      expect(clientUserReader.findClientIdByUserId).toHaveBeenCalledWith(
        'admin-1',
      );
      expect(findReception.execute).toHaveBeenCalledWith(
        'client-own',
        'reception-1',
      );
      expect(findReceptionByTenant.execute).not.toHaveBeenCalled();
    });

    it('does not attach when a productor targets another client reception', async () => {
      clientUserReader.findClientIdByUserId.mockResolvedValue('client-own');
      findReception.execute.mockRejectedValue(
        new EntityNotFoundError('Reception with id reception-9 not found'),
      );

      await expect(
        controller.attach(
          'reception-9',
          { user: { ...mockUser, role: 'PRODUCTOR' } } as never,
          { dataUrl },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(attachPhoto.execute).not.toHaveBeenCalled();
    });

    it('reports a productor without a linked client as not found', async () => {
      clientUserReader.findClientIdByUserId.mockResolvedValue(null);

      await expect(
        controller.attach(
          'reception-1',
          { user: { ...mockUser, role: 'PRODUCTOR' } } as never,
          { dataUrl },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(attachPhoto.execute).not.toHaveBeenCalled();
    });

    it('translates an invalid image to 400', async () => {
      findReceptionByTenant.execute.mockResolvedValue({
        id: 'reception-1',
      } as never);
      attachPhoto.execute.mockRejectedValue(
        new InvalidInputError('dataUrl must be a base64 image'),
      );

      await expect(
        controller.attach('reception-1', { user: mockUser } as never, {
          dataUrl: 'not-an-image',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('translates a full album to 409', async () => {
      findReceptionByTenant.execute.mockResolvedValue({
        id: 'reception-1',
      } as never);
      attachPhoto.execute.mockRejectedValue(
        new PhotoLimitExceededError('RECEPCION', 'reception-1', 5),
      );

      await expect(
        controller.attach('reception-1', { user: mockUser } as never, {
          dataUrl,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('GET /receptions/:id/photos', () => {
    it('returns the album scoped to the caller tenant', async () => {
      findReceptionByTenant.execute.mockResolvedValue({
        id: 'reception-1',
      } as never);
      listPhotos.execute.mockResolvedValue([photoRecord]);

      await expect(
        controller.list('reception-1', { user: mockUser } as never),
      ).resolves.toEqual([expectedResponse]);

      expect(listPhotos.execute).toHaveBeenCalledWith(
        'RECEPCION',
        'reception-1',
      );
    });

    it('does not list the album of a reception outside the tenant', async () => {
      findReceptionByTenant.execute.mockRejectedValue(
        new EntityNotFoundError('Reception with id reception-9 not found'),
      );

      await expect(
        controller.list('reception-9', { user: mockUser } as never),
      ).rejects.toThrow(NotFoundException);

      expect(listPhotos.execute).not.toHaveBeenCalled();
    });
  });
});
