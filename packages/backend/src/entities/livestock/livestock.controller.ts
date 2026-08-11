import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { LivestockStatus } from './domain/livestock-status';
import {
  CreateLivestockInput,
  UpdateLivestockInput,
} from './application/livestock.types';
import { LivestockService } from './livestock.service';

type CreateLivestockBody = CreateLivestockInput;

type UpdateLivestockBody = UpdateLivestockInput & {
  status?: LivestockStatus;
};

@Controller('livestocks')
export class LivestockController {
  constructor(private readonly service: LivestockService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: CreateLivestockBody) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateLivestockBody,
  ) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
