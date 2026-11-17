import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConsolidatedReportUseCase } from './application/use-cases/consolidated-report.use-case';

@Injectable()
export class MachineReportService {
  constructor(private readonly report: ConsolidatedReportUseCase) {}

  async consolidated(userId: string, tenantId: string) {
    try {
      return await this.report.execute(userId, tenantId);
    } catch (error) {
      console.error('Error finding consolidated machine report:', error);
      throw new InternalServerErrorException('Error finding consolidated machine report');
    }
  }
}
