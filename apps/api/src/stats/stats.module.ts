import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
