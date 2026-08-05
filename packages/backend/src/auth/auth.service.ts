import {
  Inject,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { UserRole } from '../entities/user/domain/user-role';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
  RefreshTokenWithUser,
} from './ports/refresh-token.repository';
import {
  USER_CREDENTIALS_REPOSITORY,
  UserCredentialsRepositoryPort,
} from './ports/user-credentials.repository';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ACCESS_TOKEN_EXPIRATION = '15m';
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

// Usuario autenticado que llega a login(): lo inyecta el LocalStrategy en
// req.user (entidad completa). Acá solo se consumen estos campos, así que se
// declara un tipo mínimo en vez de acoplar login() a la shape de UserEntity.
export interface AuthenticatedUser {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_CREDENTIALS_REPOSITORY)
    private readonly userCredentialsRepository: UserCredentialsRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserCredentials(email: string, password: string) {
    const user = await this.userCredentialsRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (!user.active || user.deleted) {
      throw new UnauthorizedException('Cuenta desactivada o inactiva');
    }

    // Verificar si la cuenta está bloqueada temporalmente
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      const timeText =
        remainingMinutes > 1
          ? `${remainingMinutes} minutos`
          : `${remainingSeconds} segundos`;

      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Reintente en ${timeText}.`,
          remainingSeconds,
          remainingMinutes,
        },
        HttpStatus.LOCKED,
      );
    }

    // Verificar contraseña con argon2 (o fallback bcrypt si fue creado previamente)
    let isPasswordValid = false;
    let shouldMigrateHash = false;

    if (
      user.passwordHash.startsWith('$2b$') ||
      user.passwordHash.startsWith('$2a$')
    ) {
      try {
        const bcrypt = (await import('bcrypt')) as {
          compare: (password: string, hash: string) => Promise<boolean>;
        };
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (isPasswordValid) {
          shouldMigrateHash = true;
        }
      } catch {
        isPasswordValid = false;
      }
    } else {
      try {
        isPasswordValid = await argon2.verify(user.passwordHash, password);
      } catch {
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }

      await this.userCredentialsRepository.update(user.id, {
        failedLoginAttempts: newAttempts,
        lockedUntil,
      });

      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    // Si las credenciales son correctas, resetear intentos fallidos y migrar el hash a Argon2 si era legacy (bcrypt)
    const newPasswordHash = shouldMigrateHash
      ? await argon2.hash(password)
      : undefined;

    if (
      user.failedLoginAttempts > 0 ||
      user.lockedUntil !== null ||
      shouldMigrateHash
    ) {
      await this.userCredentialsRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      });
    }

    return user;
  }

  async login(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      firmaId: user.companyId,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRATION,
    });

    const refreshTokenRaw = randomBytes(40).toString('hex');
    const refreshTokenHash = await argon2.hash(refreshTokenRaw);

    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firmaId: user.companyId,
      },
    };
  }

  async refreshTokens(refreshTokenRaw: string) {
    if (!refreshTokenRaw) {
      throw new BadRequestException('Refresh token requerido');
    }

    // Buscar tokens de actualización activos
    const activeTokens = await this.refreshTokenRepository.findActiveWithUser();

    let matchedTokenRecord: RefreshTokenWithUser | null = null;

    for (const tokenRecord of activeTokens) {
      const matches = await argon2.verify(
        tokenRecord.tokenHash,
        refreshTokenRaw,
      );
      if (matches) {
        matchedTokenRecord = tokenRecord;
        break;
      }
    }

    if (!matchedTokenRecord || !matchedTokenRecord.user) {
      throw new UnauthorizedException(
        'Refresh token inválido, expirado o revocado',
      );
    }

    const user = matchedTokenRecord.user;
    if (!user.active || user.deleted) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Rotación de Refresh Token: revocar el token usado
    await this.refreshTokenRepository.revoke(matchedTokenRecord.id);

    // Generar nuevo par de tokens
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      firmaId: user.companyId,
      email: user.email,
    };

    const newAccessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRATION,
    });

    const newRefreshTokenRaw = randomBytes(40).toString('hex');
    const newRefreshTokenHash = await argon2.hash(newRefreshTokenRaw);

    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenRaw,
    };
  }

  async logout(refreshTokenRaw: string) {
    if (!refreshTokenRaw) {
      return { message: 'Sesión cerrada correctamente' };
    }

    const activeTokens = await this.refreshTokenRepository.findAllActive();

    for (const tokenRecord of activeTokens) {
      const matches = await argon2.verify(
        tokenRecord.tokenHash,
        refreshTokenRaw,
      );
      if (matches) {
        await this.refreshTokenRepository.revoke(tokenRecord.id);
        break;
      }
    }

    return { message: 'Sesión cerrada correctamente' };
  }
}
