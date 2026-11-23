import { InvalidInputError } from './errors';

/**
 * Calendar days are plain `YYYY-MM-DD` strings: a range is decided on whole
 * calendar days, inclusive at both ends, never on instants.
 */
export interface DayRange {
  from: string;
  to: string;
}

/** The range a request resolved to; `campaign` is null for a custom range. */
export interface ResolvedRange extends DayRange {
  campaign: string | null;
}

export interface RangeInput {
  campaign?: string;
  from?: string;
  to?: string;
}

const CAMPAIGN_PATTERN = /^(\d{4})\/(\d{2})$/;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Argentina (America/Argentina/Cordoba) has used a fixed UTC-3 offset, without
 * daylight saving, since 2009. A fixed offset keeps the domain free of ICU data
 * and makes the bounds deterministic.
 */
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function suffixOf(year: number): string {
  return pad2((year + 1) % 100);
}

function assertDay(day: string): { year: number; month: number } {
  const match = DAY_PATTERN.exec(day);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (
      date.getUTCFullYear() === Number(y) &&
      date.getUTCMonth() === Number(m) - 1 &&
      date.getUTCDate() === Number(d)
    ) {
      return { year: Number(y), month: Number(m) };
    }
  }
  throw new InvalidInputError(
    `Fecha inválida: "${day}" (se espera AAAA-MM-DD)`,
  );
}

/** `2025/26` -> 2025-07-01 .. 2026-06-30 (1 July to 30 June, suffix = year + 1). */
export function resolveCampaignRange(campaign: string): DayRange {
  const match = CAMPAIGN_PATTERN.exec(campaign);
  if (!match || match[2] !== suffixOf(Number(match[1]))) {
    throw new InvalidInputError(
      `Campaña inválida: "${campaign}" (se espera AAAA/AA con el año siguiente, por ejemplo 2025/26)`,
    );
  }
  const year = Number(match[1]);
  return { from: `${year}-07-01`, to: `${year + 1}-06-30` };
}

/** The campaign a calendar day belongs to. */
export function campaignOf(day: string): string {
  const { year, month } = assertDay(day);
  const start = month >= 7 ? year : year - 1;
  return `${start}/${suffixOf(start)}`;
}

/** The Argentine calendar day an instant falls on. */
export function argentinaDayOf(instant: Date): string {
  return new Date(instant.getTime() + ARGENTINA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** The current campaign first, then `count - 1` previous ones. */
export function recentCampaigns(now: Date, count: number): string[] {
  const { year, month } = assertDay(argentinaDayOf(now));
  const start = month >= 7 ? year : year - 1;
  return Array.from({ length: count }, (_, index) => {
    const campaignStart = start - index;
    return `${campaignStart}/${suffixOf(campaignStart)}`;
  });
}

/**
 * Resolves the request filters: a campaign, or a custom `from`..`to` with
 * `from <= to`, never both. With nothing given it is the current campaign.
 */
export function resolveRange(input: RangeInput, now: Date): ResolvedRange {
  const hasCustom = input.from !== undefined || input.to !== undefined;

  if (input.campaign !== undefined && hasCustom) {
    throw new InvalidInputError(
      'Indicá una campaña o un rango personalizado, no ambos',
    );
  }

  if (input.campaign !== undefined) {
    return {
      campaign: input.campaign,
      ...resolveCampaignRange(input.campaign),
    };
  }

  if (hasCustom) {
    if (input.from === undefined || input.to === undefined) {
      throw new InvalidInputError('El rango personalizado exige desde y hasta');
    }
    assertDay(input.from);
    assertDay(input.to);
    if (input.from > input.to) {
      throw new InvalidInputError(
        'El rango es inválido: "desde" es posterior a "hasta"',
      );
    }
    return { campaign: null, from: input.from, to: input.to };
  }

  const current = recentCampaigns(now, 1)[0];
  return { campaign: current, ...resolveCampaignRange(current) };
}

function dayStartUtc(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

export interface DateBounds {
  /** Inclusive lower bound. */
  gte: Date;
  /** Exclusive upper bound. */
  lt: Date;
}

/**
 * Daily reports carry a real instant: `[from 00:00, to + 1 day 00:00)` in
 * Argentine time. With UTC, a report of 30 June at 22:00 (Argentina) would fall
 * into the next campaign.
 */
export function reportDateBounds(range: DayRange): DateBounds {
  return {
    gte: new Date(dayStartUtc(range.from) - ARGENTINA_OFFSET_MS),
    lt: new Date(dayStartUtc(range.to) + DAY_MS - ARGENTINA_OFFSET_MS),
  };
}

/**
 * Expenses are stored at UTC midnight of their calendar day (Unit 3), so they
 * are bounded by whole UTC days. The Argentine bounds would let the day after
 * the range (00:00Z) in, because it lies before 03:00Z.
 */
export function expenseDateBounds(range: DayRange): DateBounds {
  return {
    gte: new Date(dayStartUtc(range.from)),
    lt: new Date(dayStartUtc(range.to) + DAY_MS),
  };
}
