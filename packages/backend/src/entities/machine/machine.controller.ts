import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMachineInput, UpdateMachineInput } from './application/machine.types';
import { MachineService } from './machine.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateMachineBody = Omit<CreateMachineInput, 'companyId'> & {
  companyId?: string;
};

type UpdateMachineBody = UpdateMachineInput & {
  companyId?: string;
};

@Controller('machines')
export class MachineController {
  constructor(private readonly service: MachineService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateMachineBody) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.create(req.user.firmaId, payload as CreateMachineInput);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateMachineBody,
  ) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.update(id, req.user.firmaId, payload as UpdateMachineInput);
  }
  //no va un delete pues no se borra una máquina, se le pone una baja logica
}
