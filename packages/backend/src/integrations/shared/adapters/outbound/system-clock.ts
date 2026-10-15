import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../application/ports/clock.ports';

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
