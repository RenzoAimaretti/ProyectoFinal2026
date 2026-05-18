import { Module } from '@nestjs/common';
import { LivestockEventService } from './livestock-event.service';
import { LivestockEventController } from './livestock-event.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockEventController],
  providers: [LivestockEventService],
  exports: [LivestockEventService],
})
export class LivestockEventModule {}
