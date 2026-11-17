import { InvalidInputError } from './errors';
import { parseFuelReceipt } from './fuel-receipt.rules';

const pdf = Buffer.from('%PDF-1.4\nreceipt\n%%EOF');
const png = Buffer.from('89504e470d0a1a0a000000', 'hex');

const asUrl = (mime: string, bytes: Buffer) =>
  `data:${mime};base64,${bytes.toString('base64')}`;

describe('parseFuelReceipt', () => {
  it('accepts only matching bounded PDF and image signatures', () => {
    expect(parseFuelReceipt(asUrl('application/pdf', pdf))).toEqual({
      mimeType: 'application/pdf', bytes: pdf,
    });
    expect(parseFuelReceipt(asUrl('image/png', png))).toEqual({
      mimeType: 'image/png', bytes: png,
    });
    for (const bad of [
      asUrl('application/pdf', png),
      asUrl('image/png', pdf),
      asUrl('text/html', pdf),
      'data:application/pdf;base64,@@',
      asUrl('application/pdf', Buffer.alloc(6 * 1024 * 1024 + 1, 65)),
    ]) {
      expect(() => parseFuelReceipt(bad)).toThrow(InvalidInputError);
    }
  });
});
