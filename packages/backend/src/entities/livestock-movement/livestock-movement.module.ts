import { Module } from '@nestjs/common';
import { LivestockMovementService } from './livestock-movement.service';
import { LivestockMovementController } from './livestock-movement.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockMovementController],
  providers: [LivestockMovementService],
  exports: [LivestockMovementService],
})
export class LivestockMovementModule {}
