import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../../entities/user/domain/user-role';

// Usuario que jwt.strategy inyecta en req.user para rutas protegidas.
type JwtUser = {
  id: string;
  email: string;
  role: UserRole;
  firmaId: string;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUser>(err: any, user: TUser | null): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Token de acceso inválido o no provisto')
      );
    }
    return user;
  }
}
