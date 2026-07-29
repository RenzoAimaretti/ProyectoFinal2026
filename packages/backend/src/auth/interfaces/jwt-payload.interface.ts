import { UserRole } from '../../../prisma/generated/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  firmaId: string;
  email?: string;
  iat?: number;
  exp?: number;
}
