import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { PasswordHasherPort } from '../../application/auth.ports';

@Injectable()
export class AuthPasswordHasher implements PasswordHasherPort {
  async hash(value: string): Promise<string> {
    return argon2.hash(value);
  }

  async verify(value: string, hash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
      try {
        const valid = await bcrypt.compare(value, hash);
        return { valid, needsRehash: valid };
      } catch {
        return { valid: false, needsRehash: false };
      }
    }

    try {
      const valid = await argon2.verify(hash, value);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
}
