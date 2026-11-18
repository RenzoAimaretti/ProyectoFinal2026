import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { InvoiceModule } from './invoice.module';
import { InvoiceController } from './adapters/inbound/invoice.controller';
import { CreateInvoiceUseCase } from './application/use-cases/create-invoice.use-case';

describe('InvoiceModule wiring', () => {
  it('registers the controller and invoice use cases', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, InvoiceModule),
    ).toContain(InvoiceController);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, InvoiceModule),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: CreateInvoiceUseCase }),
      ]),
    );
  });
});
