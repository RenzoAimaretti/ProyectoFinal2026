import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { LivestockEventService } from './livestock-event.service';
import { EventType } from './domain/event-type';

@Controller('livestock-events')
export class LivestockEventController {
  constructor(private readonly service: LivestockEventService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body()
    data: {
      eventDate: string;
      eventType: EventType;
      livestockId: string;
      operatorId: string;
      obs?: string;
      vaccine?: string;
      dose?: number;
    },
  ) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      eventDate?: string;
      eventType?: EventType;
      livestockId: string;
      operatorId: string;
      obs?: string;
      vaccine?: string;
      dose?: number;
    },
  ) {
    return this.service.update(id, data);
  }
}
