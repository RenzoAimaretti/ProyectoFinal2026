import {
  campaignOf,
  expenseDateBounds,
  recentCampaigns,
  reportDateBounds,
  resolveCampaignRange,
  resolveRange,
} from './campaign';
import { InvalidInputError } from './errors';

describe('resolveCampaignRange', () => {
  it('resolves 2025/26 to 2025-07-01 .. 2026-06-30 inclusive', () => {
    expect(resolveCampaignRange('2025/26')).toEqual({
      from: '2025-07-01',
      to: '2026-06-30',
    });
  });

  it('wraps the suffix at the century (2099/00)', () => {
    expect(resolveCampaignRange('2099/00')).toEqual({
      from: '2099-07-01',
      to: '2100-06-30',
    });
  });

  it.each(['2025/28', '2025/25', '2025-26', '25/26', '2025/2', '', 'abc'])(
    'rejects the inconsistent or malformed id "%s"',
    (id) => {
      expect(() => resolveCampaignRange(id)).toThrow(InvalidInputError);
    },
  );
});

describe('campaignOf', () => {
  it.each([
    ['2025-07-01', '2025/26'],
    ['2026-06-30', '2025/26'],
    ['2026-01-15', '2025/26'],
    ['2026-07-01', '2026/27'],
    ['2025-06-30', '2024/25'],
  ])('puts %s in campaign %s', (day, campaign) => {
    expect(campaignOf(day)).toBe(campaign);
  });

  it('rejects a malformed day', () => {
    expect(() => campaignOf('2025-13-01')).toThrow(InvalidInputError);
    expect(() => campaignOf('hoy')).toThrow(InvalidInputError);
  });
});

describe('recentCampaigns', () => {
  it('lists the current campaign first, then the previous ones', () => {
    expect(recentCampaigns(new Date('2026-11-23T12:00:00Z'), 3)).toEqual([
      '2026/27',
      '2025/26',
      '2024/25',
    ]);
  });

  it('uses the Argentine calendar day: 2026-07-01 01:00Z is still 2026-06-30 there', () => {
    expect(recentCampaigns(new Date('2026-07-01T01:00:00Z'), 1)).toEqual([
      '2025/26',
    ]);
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-11-23T12:00:00Z');

  it('uses the campaign when given', () => {
    expect(resolveRange({ campaign: '2025/26' }, now)).toEqual({
      campaign: '2025/26',
      from: '2025-07-01',
      to: '2026-06-30',
    });
  });

  it('accepts a custom range 2026-01-01 .. 2026-03-31', () => {
    expect(resolveRange({ from: '2026-01-01', to: '2026-03-31' }, now)).toEqual(
      { campaign: null, from: '2026-01-01', to: '2026-03-31' },
    );
  });

  it('accepts a one-day range', () => {
    expect(resolveRange({ from: '2026-01-01', to: '2026-01-01' }, now)).toEqual(
      { campaign: null, from: '2026-01-01', to: '2026-01-01' },
    );
  });

  it('rejects an inverted range', () => {
    expect(() =>
      resolveRange({ from: '2026-03-31', to: '2026-01-01' }, now),
    ).toThrow(InvalidInputError);
  });

  it.each([
    [{ from: '2026-01-01' }],
    [{ to: '2026-01-01' }],
    [{ from: '2026-02-30', to: '2026-03-01' }],
    [{ from: 'x', to: 'y' }],
    [{ campaign: '2025/26', from: '2026-01-01', to: '2026-03-31' }],
    [{ campaign: '2025/28' }],
  ])('rejects the invalid input %j', (input) => {
    expect(() => resolveRange(input, now)).toThrow(InvalidInputError);
  });

  it('falls back to the current campaign when nothing is given', () => {
    expect(resolveRange({}, now)).toEqual({
      campaign: '2026/27',
      from: '2026-07-01',
      to: '2027-06-30',
    });
  });
});

describe('date bounds', () => {
  const range = { campaign: null, from: '2026-01-01', to: '2026-03-31' };

  it('bounds reports by [from 00:00, to + 1 day 00:00) in Argentine time', () => {
    const bounds = reportDateBounds(range);
    expect(bounds.gte.toISOString()).toBe('2026-01-01T03:00:00.000Z');
    expect(bounds.lt.toISOString()).toBe('2026-04-01T03:00:00.000Z');
  });

  it('keeps a report of the last day at 22:00 Argentine time inside and the next day outside', () => {
    const { gte, lt } = reportDateBounds(range);
    const lastDayNight = new Date('2026-04-01T01:00:00Z'); // 03-31 22:00 ART
    const nextDay = new Date('2026-04-01T03:00:00Z'); // 04-01 00:00 ART
    expect(lastDayNight >= gte && lastDayNight < lt).toBe(true);
    expect(nextDay < lt).toBe(false);
  });

  it('bounds expenses (stored at UTC midnight) by whole UTC days', () => {
    const { gte, lt } = expenseDateBounds(range);
    expect(gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(lt.toISOString()).toBe('2026-04-01T00:00:00.000Z');

    const lastDay = new Date('2026-03-31T00:00:00Z');
    const dayAfter = new Date('2026-04-01T00:00:00Z');
    expect(lastDay >= gte && lastDay < lt).toBe(true);
    expect(dayAfter < lt).toBe(false);
  });

  it('crosses month and year ends', () => {
    const bounds = expenseDateBounds({
      from: '2025-07-01',
      to: '2026-06-30',
    });
    expect(bounds.lt.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(
      expenseDateBounds({
        from: '2026-12-31',
        to: '2026-12-31',
      }).lt.toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z');
  });
});
