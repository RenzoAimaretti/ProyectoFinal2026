import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { LivestockService } from './livestock.service';
import { LivestockStatus } from '../../../prisma/generated/client';

type CreateLivestockBody = {
  companyId: string;
  lotId?: string | null;
  tagNumber: string;
  breed?: string | null;
  species: string;
  birthDate?: string | null;
  sex: string;
};

type UpdateLivestockBody = Partial<CreateLivestockBody> & {
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
  update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateLivestockBody) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
