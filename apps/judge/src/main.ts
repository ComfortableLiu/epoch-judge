import { syncDatabaseSchema } from '@epoch-judge/db';
import { loadMonorepoEnv } from '@epoch-judge/shared';

loadMonorepoEnv();
syncDatabaseSchema();

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { JudgeAppModule } from './judge-app.module';

async function bootstrap() {
  const app = await NestFactory.create(JudgeAppModule);

  const grpcPort = Number(process.env.JUDGE_GRPC_PORT ?? 50051);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'epoch.judge.v1',
      protoPath: join(__dirname, '../proto/judge.proto'),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  await app.init();
  console.log(`EpochJudge Judge Worker started (gRPC :${grpcPort})`);
}

bootstrap();
