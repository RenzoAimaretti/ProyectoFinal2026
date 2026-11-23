import { Inject, Injectable } from '@nestjs/common';
import {
  HTTP_CLIENT,
  HttpClientPort,
} from '../../../shared/application/ports/http-client.ports';
import { PizarraSnapshot } from '../../domain/grain-price.types';
import { GrainPriceProviderPort } from '../../application/grain-price.ports';
import { parsePizarra } from './bcr-pizarra.parser';

export const BCR_PIZARRA_URL =
  'https://www.cac.bcr.com.ar/es/precios-de-pizarra';

/**
 * El provider solo hace el `fetch`: todo el parseo vive en `parsePizarra`,
 * que es una función pura testeable sin red (spec A13).
 */
@Injectable()
export class BcrGrainPriceProvider implements GrainPriceProviderPort {
  constructor(@Inject(HTTP_CLIENT) private readonly http: HttpClientPort) {}

  async fetchPizarra(): Promise<PizarraSnapshot> {
    const response = await this.http.request({ url: BCR_PIZARRA_URL });

    return parsePizarra(response.body);
  }
}
