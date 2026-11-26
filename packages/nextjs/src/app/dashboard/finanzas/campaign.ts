/**
 * Agricultural campaign helpers of the calculator. A pure mirror of the
 * backend rule (1 July to 30 June, suffix = year + 1) used only to build the
 * selector and to validate a custom range before asking; the backend decides
 * the real range and answers 400 for an invalid one. No runtime imports: this
 * file is loaded directly by `node --test`.
 */

export type DayRange = { from: string; to: string };

export type CampaignOption = { value: string; label: string };

export type RangeSelection =
  | { kind: "campaign"; campaign: string }
  | { kind: "range"; from: string; to: string };

/** The filter the API takes: a campaign, or a from/to range, never both. */
export type RangeFilter = { campaign: string } | { from: string; to: string };

const CAMPAIGN_PATTERN = /^(\d{4})\/(\d{2})$/;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Argentina has used a fixed UTC-3 offset (no daylight saving) since 2009. */
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function suffixOf(year: number): string {
  return pad2((year + 1) % 100);
}

function parseDay(day: unknown): { year: number; month: number } | null {
  if (typeof day !== "string") return null;
  const match = DAY_PATTERN.exec(day);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const valid =
    date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
  return valid ? { year: Number(y), month: Number(m) } : null;
}

/** `2025/26` -> 2025-07-01 .. 2026-06-30; `null` for an inconsistent or malformed id. */
export function resolveCampaignRange(campaign: string | null | undefined): DayRange | null {
  if (typeof campaign !== "string") return null;
  const match = CAMPAIGN_PATTERN.exec(campaign);
  if (!match || match[2] !== suffixOf(Number(match[1]))) return null;
  const year = Number(match[1]);
  return { from: `${year}-07-01`, to: `${year + 1}-06-30` };
}

/** The campaign a calendar day (`YYYY-MM-DD`) belongs to; `null` for an invalid day. */
export function campaignOf(day: string): string | null {
  const parsed = parseDay(day);
  if (!parsed) return null;
  const start = parsed.month >= 7 ? parsed.year : parsed.year - 1;
  return `${start}/${suffixOf(start)}`;
}

/** The Argentine calendar day of an instant. */
function argentinaDayOf(instant: Date): string {
  return new Date(instant.getTime() + ARGENTINA_OFFSET_MS).toISOString().slice(0, 10);
}

export function currentCampaign(now: Date): string {
  // The day of a valid Date is always a valid day.
  return campaignOf(argentinaDayOf(now)) as string;
}

/** The current campaign first, then `count - 1` previous ones. */
export function recentCampaigns(now: Date, count: number): string[] {
  const start = Number(currentCampaign(now).slice(0, 4));
  return Array.from({ length: count }, (_, index) => {
    const year = start - index;
    return `${year}/${suffixOf(year)}`;
  });
}

export function campaignOptions(now: Date, count: number): CampaignOption[] {
  return recentCampaigns(now, count).map((campaign) => ({
    value: campaign,
    label: `Campaña ${campaign}`,
  }));
}

/** A message when the custom range cannot be asked for, or `null` when it can. */
export function validateCustomRange(from: string, to: string): string | null {
  if (!from || !to) return "Indicá las fechas desde y hasta.";
  if (!parseDay(from) || !parseDay(to)) return "Alguna de las fechas es inválida.";
  if (from > to) return 'La fecha "desde" es posterior a "hasta".';
  return null;
}

export function rangeFilter(selection: RangeSelection): RangeFilter {
  return selection.kind === "campaign"
    ? { campaign: selection.campaign }
    : { from: selection.from, to: selection.to };
}

function formatDay(day: string): string {
  const match = DAY_PATTERN.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day;
}

/** The range the API resolved, for the header of the table. */
export function describeRange(range: { campaign: string | null; from: string; to: string }): string {
  const days = `${formatDay(range.from)} al ${formatDay(range.to)}`;
  return range.campaign ? `Campaña ${range.campaign} (${days})` : `Del ${days}`;
}
