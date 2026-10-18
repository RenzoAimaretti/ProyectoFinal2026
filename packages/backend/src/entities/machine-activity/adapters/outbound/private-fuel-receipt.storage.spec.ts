import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PrivateFuelReceiptStorage } from './private-fuel-receipt.storage';

const bytes = Buffer.from('%PDF-1.4\nreceipt\n%%EOF');

describe('PrivateFuelReceiptStorage', () => {
  let directory: string;
  let storage: PrivateFuelReceiptStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(process.cwd(), '.private-receipts-test-'));
    storage = new PrivateFuelReceiptStorage();
    (storage as unknown as { directory: string }).directory = directory;
  });

  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it('writes only opaque local bytes, reads them and fully removes rolled-back files', async () => {
    const key = await storage.write(bytes);
    expect(key).toMatch(/^[a-f0-9-]{36}$/);
    expect(await readdir(directory)).toEqual([key]);
    await expect(storage.read(key)).resolves.toEqual(bytes);
    expect(() => storage.read('../uploads/foreign')).toThrow('Invalid receipt storage key');
    await storage.remove(key);
    expect(await readdir(directory)).toEqual([]);
  });
});
