import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The seed wipes demo data in reverse-FK order. Expenses reference lots and
 * categories with RESTRICT foreign keys, so a re-run fails unless they are
 * deleted first. The wipe is a plain list of `deleteMany()` calls, so the order
 * can be checked from the source without a database.
 */
function wipeOrder(): string[] {
  const source = readFileSync(
    join(__dirname, '../../../prisma/seed.ts'),
    'utf-8',
  );
  const block = /\$transaction\(\[([\s\S]*?)\]\)/.exec(source);
  if (!block) throw new Error('seed wipe transaction not found');
  return [...block[1].matchAll(/prisma\.(\w+)\.deleteMany\(\)/g)].map(
    (match) => match[1],
  );
}

describe('seed reset order', () => {
  const order = wipeOrder();
  const at = (model: string) => order.indexOf(model);

  it('deletes suggestions, then expenses, then expense categories, all before the lots they reference', () => {
    for (const model of ['expenseSuggestion', 'expense', 'expenseCategory']) {
      expect(at(model)).toBeGreaterThanOrEqual(0);
      expect(at(model)).toBeLessThan(at('lot'));
    }
    expect(at('expenseSuggestion')).toBeLessThan(at('expense'));
    expect(at('expense')).toBeLessThan(at('expenseCategory'));
  });

  it('keeps the previous wipe intact: valuations before reports, tariffs before labor types, lots before farms', () => {
    expect(at('dailyReportValuation')).toBeLessThan(at('dailyReport'));
    expect(at('tariff')).toBeLessThan(at('laborType'));
    expect(at('lot')).toBeLessThan(at('farm'));
    expect(at('farm')).toBeLessThan(at('client'));
  });

  it('deletes cheques and eCheqs, then payments, then invoice items, then invoices, all before the clients and tasks they reference', () => {
    for (const model of ['cheque', 'echeq', 'payment', 'invoiceItem', 'invoice']) {
      expect(at(model)).toBeGreaterThanOrEqual(0);
      expect(at(model)).toBeLessThan(at('client'));
    }
    expect(at('cheque')).toBeLessThan(at('payment'));
    expect(at('echeq')).toBeLessThan(at('payment'));
    expect(at('payment')).toBeLessThan(at('invoice'));
    expect(at('invoiceItem')).toBeLessThan(at('invoice'));
    expect(at('invoiceItem')).toBeLessThan(at('task'));
  });

  it('never wipes the tenant bootstrap rows', () => {
    for (const model of ['tenant', 'company', 'user', 'userCompany']) {
      expect(order).not.toContain(model);
    }
  });
});
