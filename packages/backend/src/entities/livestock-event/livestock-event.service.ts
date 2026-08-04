import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventType } from './domain/event-type';
import {
  CreateLivestockEventData,
  LIVESTOCK_EVENT_REPOSITORY,
  LivestockEventRepositoryPort,
  UpdateLivestockEventData,
} from './ports/livestock-event.repository';
import {
  LIVESTOCK_REPOSITORY,
  LivestockRepositoryPort,
} from '../livestock/ports/livestock.repository';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../user/ports/user.repository';

@Injectable()
export class LivestockEventService {
  constructor(
    @Inject(LIVESTOCK_EVENT_REPOSITORY)
    private readonly livestockEventRepository: LivestockEventRepositoryPort,
    @Inject(LIVESTOCK_REPOSITORY)
    private readonly livestockRepository: LivestockRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async findAll() {
    try {
      return await this.livestockEventRepository.findAll();
    } catch (error) {
      console.error('Error fetching livestock events:', error);
      throw new InternalServerErrorException('Error fetching livestock events');
    }
  }

  async findOne(id: string) {
    try {
      const event = await this.livestockEventRepository.findById(id);

      if (!event) {
        throw new NotFoundException(`Livestock event with id ${id} not found`);
      }

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      console.error('Error fetching livestock event:', error);
      throw new InternalServerErrorException('Error fetching livestock event');
    }
  }

  async update(
    id: string,
    data: {
      eventDate?: string;
      eventType?: EventType;
      livestockId?: string;
      operatorId?: string;
      obs?: string;
      vaccine?: string;
      dose?: number;
    },
  ) {
    try {
      const existingEvent = await this.livestockEventRepository.findById(id);

      if (!existingEvent) {
        throw new NotFoundException(`Livestock event with id ${id} not found`);
      }

      if (data.livestockId !== undefined) {
        const livestock = await this.livestockRepository.findById(
          data.livestockId,
        );

        if (!livestock) {
          throw new NotFoundException(
            `Livestock with id ${data.livestockId} not found`,
          );
        }
      }

      if (data.operatorId !== undefined) {
        const operator = await this.userRepository.findById(data.operatorId);

        if (!operator) {
          throw new NotFoundException(
            `Operator with id ${data.operatorId} not found`,
          );
        }
      }

      let eventDate: Date | undefined;

      if (data.eventDate !== undefined) {
        eventDate = new Date(data.eventDate);

        if (Number.isNaN(eventDate.getTime())) {
          throw new BadRequestException('eventDate must be a valid date');
        }
      }
      // Si `eventType` viene definido y no es VACUNACION, limpiar vaccine y dose (setear a null)
      const updateData: UpdateLivestockEventData = {
        ...(eventDate !== undefined ? { eventDate } : {}),
        ...(data.eventType !== undefined ? { type: data.eventType } : {}),
        ...(data.livestockId !== undefined
          ? { livestockId: data.livestockId }
          : {}),
        ...(data.operatorId !== undefined
          ? { operatorId: data.operatorId }
          : {}),
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        // Si se especifica eventType y NO es VACUNACION, forzamos limpiar vaccine/dose
        ...(data.eventType !== undefined &&
        data.eventType !== EventType.VACUNACION
          ? { vaccine: null, dose: null }
          : {
              ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
              ...(data.dose !== undefined ? { dose: data.dose } : {}),
            }),
      };

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      return await this.livestockEventRepository.update(id, updateData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error updating livestock event:', error);
      throw new InternalServerErrorException('Error updating livestock event');
    }
  }

  async create(data: {
    eventDate: string;
    eventType: EventType;
    livestockId: string;
    operatorId: string;
    obs?: string;
    vaccine?: string;
    dose?: number;
  }) {
    try {
      if (
        !data.livestockId ||
        !data.operatorId ||
        !data.eventDate ||
        !data.eventType
      ) {
        throw new BadRequestException(
          'livestockId, operatorId, eventDate and eventType are required',
        );
      }

      const [livestock, operator] = await Promise.all([
        this.livestockRepository.findById(data.livestockId),
        this.userRepository.findById(data.operatorId),
      ]);

      if (!livestock) {
        throw new NotFoundException(
          `Livestock with id ${data.livestockId} not found`,
        );
      }

      if (!operator) {
        throw new NotFoundException(
          `Operator with id ${data.operatorId} not found`,
        );
      }

      const eventDate = new Date(data.eventDate);

      if (Number.isNaN(eventDate.getTime())) {
        throw new BadRequestException('eventDate must be a valid date');
      }
      // Si eventType no es VACUNACION, no enviar vaccine ni dose (comportamiento
      // legacy de livestock-event.service.ts líneas 142-145, byte-idéntico: el
      // legacy mutaba el input; acá se replica en la construcción del createData).
      const isVacunacion =
        data.eventType !== undefined && data.eventType === EventType.VACUNACION;

      const createData: CreateLivestockEventData = {
        eventDate,
        type: data.eventType,
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        ...(isVacunacion && data.vaccine !== undefined
          ? { vaccine: data.vaccine }
          : {}),
        ...(isVacunacion && data.dose !== undefined ? { dose: data.dose } : {}),
      };

      return await this.livestockEventRepository.create(createData);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error creating livestock event:', error);
      throw new InternalServerErrorException('Error creating livestock event');
    }
  }
}
