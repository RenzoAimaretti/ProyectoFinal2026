import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import {
  CLIENT_USER_READER,
  ClientUserReaderPort,
} from '../../../client/application/client.ports';
import { FindReceptionByTenantUseCase } from '../../../reception/application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionUseCase } from '../../../reception/application/use-cases/find-reception.use-case';
import { PhotoRecord } from '../../application/photo.types';
import { AttachPhotoFromDataUrlUseCase } from '../../application/use-cases/attach-photo-from-data-url.use-case';
import { ListEntityPhotosUseCase } from '../../application/use-cases/list-entity-photos.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  PhotoLimitExceededError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    id: string;
    role: string;
    tenantId: string;
  };
};

type AttachReceptionPhotoBody = {
  dataUrl: string;
  orderIndex?: number;
};

const RECEPTION_ENTITY_TYPE = 'RECEPCION';

/**
 * HTTP inbound adapter for the photos of a reception.
 *
 * Every route verifies the target reception belongs to the caller before
 * touching the album: an ADMIN (or any non-PRODUCTOR role) reads it with the
 * tenant scope, while a PRODUCTOR is limited to the reception of their own
 * linked client, resolved through the same `ClientUserReaderPort` the reception
 * controller uses.
 */
@Controller('receptions')
export class PhotoController {
  constructor(
    private readonly attachPhoto: AttachPhotoFromDataUrlUseCase,
    private readonly listPhotos: ListEntityPhotosUseCase,
    private readonly findReception: FindReceptionUseCase,
    private readonly findReceptionByTenant: FindReceptionByTenantUseCase,
    @Inject(CLIENT_USER_READER)
    private readonly clientUserReader: ClientUserReaderPort,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos')
  async attach(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: AttachReceptionPhotoBody,
  ) {
    try {
      await this.assertReceptionInScope(id, req.user);

      const photo = await this.attachPhoto.execute(
        RECEPTION_ENTITY_TYPE,
        id,
        { dataUrl: body?.dataUrl, orderIndex: body?.orderIndex },
      );

      return this.toResponse(photo);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/photos')
  async list(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      await this.assertReceptionInScope(id, req.user);

      const photos = await this.listPhotos.execute(
        RECEPTION_ENTITY_TYPE,
        id,
      );

      return photos.map((photo) => this.toResponse(photo));
    } catch (error) {
      this.translate(error);
    }
  }

  private async assertReceptionInScope(
    id: string,
    user: RequestWithUser['user'],
  ): Promise<void> {
    if (user.role === 'PRODUCTOR') {
      const clientId = await this.resolveOwnClientId(user.id);
      await this.findReception.execute(clientId, id);
      return;
    }

    await this.findReceptionByTenant.execute(id, user.tenantId);
  }

  private async resolveOwnClientId(userId: string): Promise<string> {
    const clientId = await this.clientUserReader.findClientIdByUserId(userId);

    if (!clientId) {
      throw new NotFoundException(
        'El usuario autenticado no está vinculado a un cliente',
      );
    }

    return clientId;
  }

  private toResponse(photo: PhotoRecord) {
    return {
      id: photo.id,
      entityType: photo.entityType,
      entityId: photo.entityId,
      url: photo.localPath,
      orderIndex: photo.orderIndex,
      createdAt: photo.createdAt,
    };
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof PhotoLimitExceededError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
