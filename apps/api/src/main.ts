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

  // Trust proxy（nginx 反向代理后读取 X-Forwarded-For 真实 IP）
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy !== 'false') {
    const express = app.getHttpAdapter().getInstance();
    express.set('trust proxy', trustProxy ?? 1);
  }

  // CORS 配置
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  const isDev = process.env.NODE_ENV !== 'production';
  const defaultOrigin = isDev ? 'http://localhost:8080' : undefined;
  const origins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : defaultOrigin
      ? [defaultOrigin]
      : [];

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Locale'],
  });

  console.log(`CORS origins: ${origins.length > 0 ? origins.join(', ') : '(none — cross-origin requests blocked)'}`);

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
