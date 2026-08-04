import { Module } from '@nestjs/common';
import { LivestockEventService } from './livestock-event.service';
import { LivestockEventController } from './livestock-event.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LIVESTOCK_EVENT_REPOSITORY } from './ports/livestock-event.repository';
import { PrismaLivestockEventRepository } from './adapters/outbound/prisma/prisma-livestock-event.repository';
import { LivestockModule } from '../livestock/livestock.module';
import { UserModule } from '../user/user.module';

@Module({
  // T-F2-34 (D1): cross-reads vía los puertos exportados por sus dueños —
  // LIVESTOCK_REPOSITORY (wave 1) y USER_REPOSITORY (wave 3), REQ-F2-03.
  imports: [PrismaModule, LivestockModule, UserModule],
  controllers: [LivestockEventController],
  providers: [
    LivestockEventService,
    {
      provide: LIVESTOCK_EVENT_REPOSITORY,
      useClass: PrismaLivestockEventRepository,
    },
  ],
  exports: [LivestockEventService, LIVESTOCK_EVENT_REPOSITORY],
})
export class LivestockEventModule {}
