import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { LivestockMovementService } from './livestock-movement.service';

@Controller('livestock-movements')
export class LivestockMovementController {
  constructor(private readonly service: LivestockMovementService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.service.create(data);
  }
}
