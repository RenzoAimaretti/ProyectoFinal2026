import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../application/daily-report.ports';

@Injectable()
export class DailyReportSystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
