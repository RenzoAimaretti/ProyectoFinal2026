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
  // T-F2-68: body tipado inline — movementDate llega como string ISO del body
  // JSON y el service lo pasa crudo al puerto (byte-idéntico al legacy).
  create(
    @Body()
    data: {
      livestockId: string;
      lotId: string;
      movementDate: string;
      observations?: string;
    },
  ) {
    return this.service.create(data);
  }
}
