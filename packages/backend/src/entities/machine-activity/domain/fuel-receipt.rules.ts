import { InvalidInputError } from './errors';

const MAX_BYTES = 6 * 1024 * 1024;
const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'application/pdf': (bytes) => bytes.subarray(0, 5).toString() === '%PDF-' &&
    bytes.subarray(-1024).includes(Buffer.from('%%EOF')),
  'image/png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  'image/jpeg': (bytes) => bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-1) === 0xd9,
  'image/webp': (bytes) => bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP',
};

export type FuelReceipt = { mimeType: string; bytes: Buffer };

export function parseFuelReceipt(value: unknown): FuelReceipt {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_BYTES / 3) * 4 + 100) {
    throw new InvalidInputError('receipt must be a PDF or image up to 6 MB');
  }
  const match = /^data:([a-z]+\/[a-z+]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || !Object.hasOwn(SIGNATURES, match[1])) {
    throw new InvalidInputError('receipt must be a PDF or image data URL');
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES || bytes.toString('base64') !== match[2] || !SIGNATURES[match[1]](bytes)) {
    throw new InvalidInputError('receipt content does not match its type or exceeds 6 MB');
  }
  return { mimeType: match[1], bytes };
}
