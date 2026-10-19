import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MachineReportService } from './machine-report.service';

@Controller('machine-reports')
export class MachineReportController {
  constructor(private readonly service: MachineReportService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('consolidated')
  consolidated(@Req() req: { user: { id: string; tenantId: string } }) {
    return this.service.consolidated(req.user.id, req.user.tenantId);
  }
}
