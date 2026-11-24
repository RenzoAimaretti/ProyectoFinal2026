import { Injectable } from '@nestjs/common';
import { EcheqClockPort } from '../../application/echeq.ports';

@Injectable()
export class EcheqSystemClock implements EcheqClockPort {
  now(): Date {
    return new Date();
  }
}
