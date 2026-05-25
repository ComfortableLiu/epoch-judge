import { syncDatabaseSchema } from '@epoch-judge/db';
import { loadMonorepoEnv } from '@epoch-judge/shared';
import { ValidationPipe } from '@nestjs/common';

loadMonorepoEnv();
syncDatabaseSchema();
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('EpochJudge API')
    .setDescription('纪元 — 开源 OJ API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`EpochJudge API listening on http://localhost:${port}`);
}

bootstrap();
