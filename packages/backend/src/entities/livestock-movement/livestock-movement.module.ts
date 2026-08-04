import { Module } from '@nestjs/common';
import { LivestockMovementService } from './livestock-movement.service';
import { LivestockMovementController } from './livestock-movement.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LIVESTOCK_MOVEMENT_REPOSITORY } from './ports/livestock-movement.repository';
import { PrismaLivestockMovementRepository } from './adapters/outbound/prisma/prisma-livestock-movement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockMovementController],
  providers: [
    LivestockMovementService,
    {
      provide: LIVESTOCK_MOVEMENT_REPOSITORY,
      useClass: PrismaLivestockMovementRepository,
    },
  ],
  exports: [LivestockMovementService],
})
export class LivestockMovementModule {}
