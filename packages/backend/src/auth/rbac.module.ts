import { Global, Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';

/**
 * Registers the RBAC guard once so any feature module can attach it with
 * `@UseGuards(JwtAuthGuard, RolesGuard)`. The guard itself is stateless and
 * reads the required roles from the `@Roles()` metadata.
 */
@Global()
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RbacModule {}
