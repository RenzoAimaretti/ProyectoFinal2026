import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenSignerPort } from '../../application/auth.ports';
import { AuthJwtPayload } from '../../application/auth.types';

const ACCESS_TOKEN_EXPIRATION = '15m';

@Injectable()
export class JwtTokenSigner implements TokenSignerPort {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AuthJwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRATION });
  }
}
