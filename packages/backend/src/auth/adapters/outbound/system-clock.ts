import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../application/auth.ports';

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
