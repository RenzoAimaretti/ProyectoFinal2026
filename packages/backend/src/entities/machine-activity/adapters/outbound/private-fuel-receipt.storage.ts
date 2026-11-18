import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { FuelReceiptStoragePort } from '../../application/machine-activity.ports';

@Injectable()
export class PrivateFuelReceiptStorage implements FuelReceiptStoragePort {
  private readonly directory = join(process.cwd(), '.private-receipts');

  private pathFor(key: string): string {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid receipt storage key');
    return join(this.directory, key);
  }

  async write(bytes: Buffer): Promise<string> {
    const key = randomUUID();
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.pathFor(key), bytes, { flag: 'wx', mode: 0o600 });
    return key;
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.pathFor(key));
  }
}
