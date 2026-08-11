import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  CreateLivestockEventInput,
  UpdateLivestockEventInput,
} from './application/livestock-event.types';
import { LivestockEventService } from './livestock-event.service';

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
  create(@Body() data: CreateLivestockEventInput) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateLivestockEventInput) {
    return this.service.update(id, data);
  }
}
