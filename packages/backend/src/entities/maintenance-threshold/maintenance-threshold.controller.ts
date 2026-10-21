import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MaintenanceThresholdService } from './maintenance-threshold.service';

type FirmRequest = { user: { firmaId: string } };

@Controller('maintenance-thresholds')
export class MaintenanceThresholdController {
  constructor(private readonly service: MaintenanceThresholdService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get()
  findAll(@Req() req: FirmRequest) { return this.service.findAll(req.user.firmaId); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':machineType')
  upsert(@Param('machineType') type: string, @Req() req: FirmRequest, @Body() body: unknown) {
    return this.service.upsert(req.user.firmaId, type, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':machineType')
  remove(@Param('machineType') type: string, @Req() req: FirmRequest) {
    return this.service.remove(req.user.firmaId, type);
  }
}

// Registered ahead of MachineModule's :id route in AppModule so /alerts cannot be mistaken for an id.
@Controller('machines')
export class MachineAlertsController {
  constructor(private readonly service: MaintenanceThresholdService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get('alerts')
  findAll(@Req() req: FirmRequest) { return this.service.alerts(req.user.firmaId); }
}
