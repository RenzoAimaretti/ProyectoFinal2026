import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RandomTokenPort } from '../../application/auth.ports';

@Injectable()
export class RandomTokenGenerator implements RandomTokenPort {
  generateToken(): string {
    return randomBytes(40).toString('hex');
  }
}
