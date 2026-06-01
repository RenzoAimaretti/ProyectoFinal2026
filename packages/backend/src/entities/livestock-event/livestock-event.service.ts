import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventType } from '../../../prisma/generated/enums';

@Injectable()
export class LivestockEventService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.livestockEvent.findMany();
    } catch (error) {
      console.error('Error fetching livestock events:', error);
      throw new InternalServerErrorException('Error fetching livestock events');
    }
  }

  async findOne(id: string) {
    try {
      const event = await this.prisma.livestockEvent.findUnique({ where: { id } });

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

  async update(id: string, data: {
    eventDate?: string;
    eventType?: EventType;
    livestockId?: string;
    operatorId?: string;
    obs?: string;
    vaccine?: string;
    dose?: number;
  }) {
    try {
      const existingEvent = await this.prisma.livestockEvent.findUnique({ where: { id } });

      if (!existingEvent) {
        throw new NotFoundException(`Livestock event with id ${id} not found`);
      }

      if (data.livestockId !== undefined) {
        const livestock = await this.prisma.livestock.findUnique({ where: { id: data.livestockId } });

        if (!livestock) {
          throw new NotFoundException(`Livestock with id ${data.livestockId} not found`);
        }
      }

      if (data.operatorId !== undefined) {
        const operator = await this.prisma.user.findUnique({ where: { id: data.operatorId } });

        if (!operator) {
          throw new NotFoundException(`Operator with id ${data.operatorId} not found`);
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
      const updateData = {
        ...(eventDate !== undefined ? { eventDate } : {}),
        ...(data.eventType !== undefined ? { type: data.eventType } : {}),
        ...(data.livestockId !== undefined ? { livestockId: data.livestockId } : {}),
        ...(data.operatorId !== undefined ? { operatorId: data.operatorId } : {}),
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        // Si se especifica eventType y NO es VACUNACION, forzamos limpiar vaccine/dose
        ...(data.eventType !== undefined && data.eventType !== EventType.VACUNACION
          ? { vaccine: null, dose: null }
          : {
              ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
              ...(data.dose !== undefined ? { dose: data.dose } : {}),
            }),
      };

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      return await this.prisma.livestockEvent.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
      if (!data.livestockId || !data.operatorId || !data.eventDate || !data.eventType) {
        throw new BadRequestException('livestockId, operatorId, eventDate and eventType are required');
      }

      const [livestock, operator] = await Promise.all([
        this.prisma.livestock.findUnique({ where: { id: data.livestockId } }),
        this.prisma.user.findUnique({ where: { id: data.operatorId } }),
      ]);

      if (!livestock) {
        throw new NotFoundException(`Livestock with id ${data.livestockId} not found`);
      }

      if (!operator) {
        throw new NotFoundException(`Operator with id ${data.operatorId} not found`);
      }

      const eventDate = new Date(data.eventDate);

      if (Number.isNaN(eventDate.getTime())) {
        throw new BadRequestException('eventDate must be a valid date');
      }
      if (data.eventType !== undefined && data.eventType !== EventType.VACUNACION) {
        data.vaccine = undefined;
        data.dose = undefined;
      }

      const createData = {
        eventDate,
        type: data.eventType,
        livestockId: data.livestockId,
        operatorId: data.operatorId,
        ...(data.obs !== undefined ? { observations: data.obs } : {}),
        ...(data.vaccine !== undefined ? { vaccine: data.vaccine } : {}),
        ...(data.dose !== undefined ? { dose: data.dose } : {}),
      };

      return await this.prisma.livestockEvent.create({
        data: createData,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error creating livestock event:', error);
      throw new InternalServerErrorException('Error creating livestock event');
    }
  }
}

 