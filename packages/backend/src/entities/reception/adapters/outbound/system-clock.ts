import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../application/reception.ports';

@Injectable()
export class ReceptionSystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
