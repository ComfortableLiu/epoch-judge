import { findMonorepoEnvPath } from '@epoch-judge/shared';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JudgeGrpcController } from './grpc/judge.grpc.controller';
import { JudgeWorkerService } from './judge-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: findMonorepoEnvPath() ?? '.env',
    }),
  ],
  controllers: [JudgeGrpcController],
  providers: [JudgeWorkerService],
})
export class JudgeAppModule {}
