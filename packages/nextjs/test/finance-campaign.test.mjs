import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignOf,
  campaignOptions,
  currentCampaign,
  describeRange,
  rangeFilter,
  recentCampaigns,
  resolveCampaignRange,
  validateCustomRange,
} from '../src/app/dashboard/finanzas/campaign.ts';

test('campaign 2025/26 runs from 1 July to 30 June, inclusive', () => {
  assert.deepEqual(resolveCampaignRange('2025/26'), { from: '2025-07-01', to: '2026-06-30' });
});

test('the century wraps the suffix (2099/00)', () => {
  assert.deepEqual(resolveCampaignRange('2099/00'), { from: '2099-07-01', to: '2100-06-30' });
});

test('an inconsistent or malformed campaign id has no range (the API answers 400)', () => {
  for (const id of ['2025/28', '2025/25', '2025-26', '25/26', '2025/2', '', 'abc', null, undefined]) {
    assert.equal(resolveCampaignRange(id), null, String(id));
  }
});

test('campaignOf puts a calendar day in its campaign', () => {
  assert.equal(campaignOf('2025-07-01'), '2025/26');
  assert.equal(campaignOf('2026-06-30'), '2025/26');
  assert.equal(campaignOf('2026-07-01'), '2026/27');
  assert.equal(campaignOf('2025-06-30'), '2024/25');
  assert.equal(campaignOf('2025-13-01'), null);
  assert.equal(campaignOf('hoy'), null);
});

test('the current campaign follows the Argentine calendar day, not UTC', () => {
  assert.equal(currentCampaign(new Date('2026-11-23T12:00:00Z')), '2026/27');
  // 2026-07-01 01:00Z is still 30 June in Argentina.
  assert.equal(currentCampaign(new Date('2026-07-01T01:00:00Z')), '2025/26');
  assert.equal(currentCampaign(new Date('2026-07-01T03:00:00Z')), '2026/27');
});

test('recent campaigns list the current one first and go backwards', () => {
  assert.deepEqual(recentCampaigns(new Date('2026-11-23T12:00:00Z'), 3), ['2026/27', '2025/26', '2024/25']);
});

test('selector options carry the id as value and a readable label', () => {
  const options = campaignOptions(new Date('2026-11-23T12:00:00Z'), 2);
  assert.deepEqual(
    options.map((option) => option.value),
    ['2026/27', '2025/26'],
  );
  assert.equal(options[1].label, 'Campaña 2025/26');
});

test('a custom range needs from and to, valid days and from <= to', () => {
  assert.equal(validateCustomRange('2026-01-01', '2026-03-31'), null);
  assert.equal(validateCustomRange('2026-01-01', '2026-01-01'), null);
  assert.match(validateCustomRange('2026-03-31', '2026-01-01'), /posterior/);
  assert.match(validateCustomRange('', '2026-01-01'), /desde y hasta/);
  assert.match(validateCustomRange('2026-01-01', ''), /desde y hasta/);
  assert.match(validateCustomRange('2026-02-30', '2026-03-01'), /inválida/);
});

test('the filter sent to the API is a campaign or a from/to range, never both', () => {
  assert.deepEqual(rangeFilter({ kind: 'campaign', campaign: '2025/26' }), { campaign: '2025/26' });
  assert.deepEqual(rangeFilter({ kind: 'range', from: '2026-01-01', to: '2026-03-31' }), {
    from: '2026-01-01',
    to: '2026-03-31',
  });
});

test('a range is described with the campaign when there is one', () => {
  assert.equal(
    describeRange({ campaign: '2025/26', from: '2025-07-01', to: '2026-06-30' }),
    'Campaña 2025/26 (01/07/2025 al 30/06/2026)',
  );
  assert.equal(
    describeRange({ campaign: null, from: '2026-01-01', to: '2026-03-31' }),
    'Del 01/01/2026 al 31/03/2026',
  );
});
