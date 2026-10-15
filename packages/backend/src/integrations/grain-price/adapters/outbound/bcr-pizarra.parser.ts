import * as cheerio from 'cheerio';
import { UpstreamParseError } from '../../../shared/domain/errors';
import {
  GrainKey,
  GrainPriceRow,
  PizarraSnapshot,
} from '../../domain/grain-price.types';

/** Granos por texto de label, no por clase CSS: el markup de BCR puede cambiar. */
const GRAIN_BY_LABEL: Record<string, GrainKey> = {
  trigo: 'trigo',
  maiz: 'maiz',
  girasol: 'girasol',
  soja: 'soja',
  sorgo: 'sorgo',
};

/** BCR publica las fechas largas en castellano; la pizarra siempre es hora de Rosario (UTC-3). */
const MONTH_BY_NAME: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

const ARGENTINA_UTC_OFFSET = '-03:00';

/**
 * Función pura: extrae la pizarra de la CAC/BCR del HTML capturado. Si el markup
 * cambia y no se reconoce ninguna fila, lanza `UpstreamParseError` en lugar de
 * devolver precios en cero (spec A6/A13).
 */
export function parsePizarra(html: string): PizarraSnapshot {
  const $ = cheerio.load(html);
  const prices: GrainPriceRow[] = [];

  $('.board').each((_index, element) => {
    const board = $(element);
    const label = collapseWhitespace(board.find('h3').first().text());
    const grain = GRAIN_BY_LABEL[normalizeLabel(label)];

    if (!grain) {
      return;
    }

    const usdCell = board
      .find('.bottom .cell')
      .toArray()
      .find((cell) => $(cell).text().includes('US$'));

    prices.push({
      grain,
      label,
      pricePerTonArs: extractArgentineNumber(board.find('.price').first().text()),
      pricePerTonUsd: usdCell
        ? extractArgentineNumber($(usdCell).text())
        : null,
    });
  });

  if (prices.length === 0) {
    throw new UpstreamParseError(
      'The BCR pizarra page does not expose any recognizable grain board',
    );
  }

  const pageText = collapseWhitespace($('body').text());
  const date = extractPizarraDate(pageText);
  const footerText = collapseWhitespace($('.price-board-footer').text());

  return {
    source: 'cac.bcr.com.ar',
    date,
    publishedAt: extractPublishedAt(footerText),
    bnaRate: extractBnaRate(footerText),
    prices,
  };
}

function extractPizarraDate(pageText: string): string {
  const match = /Precios Pizarra del día\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(
    pageText,
  );

  if (!match) {
    throw new UpstreamParseError(
      'The BCR pizarra page does not expose the pizarra date',
    );
  }

  return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
}

function extractBnaRate(footerText: string): number | null {
  const match =
    /TC BNA Divisas\s*Comprador\s+\d{1,2}\/\d{1,2}\/\d{4}:\s*\$\s*([\d.,]+)/.exec(
      footerText,
    );

  return match ? parseArgentineNumber(match[1]) : null;
}

function extractPublishedAt(footerText: string): string | null {
  const match =
    /Rosario,\s+(\d{1,2})\s+de\s+([^\s]+)\s+del\s+(\d{4})\s*-\s*Hora:\s+(\d{1,2}):(\d{2})/.exec(
      footerText,
    );

  if (!match) {
    return null;
  }

  const [, day, monthName, year, hour, minute] = match;
  const month = MONTH_BY_NAME[normalizeLabel(monthName)];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${pad(day)}T${pad(hour)}:${minute}:00${ARGENTINA_UTC_OFFSET}`;
}

/** Primer número del texto, interpretado en formato argentino (`1.504,00`). */
function extractArgentineNumber(text: string): number | null {
  const match = /-?\d[\d.,]*/.exec(text);

  return match ? parseArgentineNumber(match[0]) : null;
}

function parseArgentineNumber(raw: string): number {
  const parsed = Number(raw.replace(/\./g, '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : NaN;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** `Maíz` -> `maiz`, `Precios de Pizarra` -> `preciosdepizarra`. */
function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function pad(value: string): string {
  return value.padStart(2, '0');
}
