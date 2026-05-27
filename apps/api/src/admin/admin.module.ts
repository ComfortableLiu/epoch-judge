import { Module } from '@nestjs/common';
import { ContestsModule } from '../contests/contests.module';
import { JudgeModule } from '../judge/judge.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminContestsController } from './admin-contests.controller';
import { AdminController } from './admin.controller';
import { RejudgeController } from './rejudge.controller';
import { RejudgeService } from './rejudge.service';

@Module({
  imports: [PrismaModule, JudgeModule, ContestsModule],
  controllers: [AdminController, RejudgeController, AdminContestsController],
  providers: [RejudgeService],
})
export class AdminModule {}
