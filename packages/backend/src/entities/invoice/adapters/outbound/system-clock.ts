import { Injectable } from '@nestjs/common';
import { InvoiceClockPort } from '../../application/invoice.ports';

@Injectable()
export class InvoiceSystemClock implements InvoiceClockPort {
  now(): Date {
    return new Date();
  }
}
