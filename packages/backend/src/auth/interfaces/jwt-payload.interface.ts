import { UserRole } from '../../entities/user/domain/user-role';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  firmaId: string;
  email?: string;
  iat?: number;
  exp?: number;
}
