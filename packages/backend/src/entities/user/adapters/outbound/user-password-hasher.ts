import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasherPort } from '../../application/user.ports';

@Injectable()
export class UserPasswordHasher implements PasswordHasherPort {
  async hash(value: string): Promise<string> {
    return argon2.hash(value);
  }
}
