import { Module } from '@nestjs/common';
import { LivestockService } from './livestock.service';
import { LivestockController } from './livestock.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockController],
  providers: [LivestockService],
  exports: [LivestockService],
})
export class LivestockModule {}
