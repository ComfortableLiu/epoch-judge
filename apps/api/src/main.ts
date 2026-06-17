import { syncDatabaseSchema } from '@epoch-judge/db';
import { loadMonorepoEnv } from '@epoch-judge/shared';
import { ValidationPipe } from '@nestjs/common';
import { checkDefaultCredentials } from './common/startup/credential-check';

loadMonorepoEnv();
checkDefaultCredentials();
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
    .setDescription(
      '纪元 — 开源 Online Judge 平台 API\n\n' +
      '## 认证\n' +
      '大部分端点需要 Bearer Token 认证。使用 `/auth/login` 获取 access token，通过 `/auth/refresh` 刷新。\n\n' +
      '## 模块\n' +
      '- **auth** — 注册、登录、刷新令牌\n' +
      '- **problems** — 题目管理、导入导出、测试数据\n' +
      '- **submissions** — 提交代码、实时判题进度（SSE）\n' +
      '- **contests** — 比赛管理、报名、计分板\n' +
      '- **users** — 用户资料、统计、管理\n' +
      '- **discussions** — 讨论与回复\n' +
      '- **admin** — 系统管理、比赛管理、重判\n' +
      '- **health** — 服务健康检查\n' +
      '- **metrics** — Prometheus 指标',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', '认证 — 注册、登录、令牌刷新')
    .addTag('problems', '题目 — 题目 CRUD、测试数据管理、导入导出')
    .addTag('submissions', '提交 — 代码提交、判题状态流式推送')
    .addTag('contests', '比赛 — 比赛列表、详情、报名、计分板')
    .addTag('users', '用户 — 个人资料、统计、管理操作')
    .addTag('discussions', '讨论 — 题目讨论与回复')
    .addTag('admin', '管理 — 系统配置、比赛管理、重判')
    .addTag('admin/announcements', '公告管理 — 公告 CRUD')
    .addTag('announcements', '公告 — 公开公告')
    .addTag('health', '健康检查 — 服务状态')
    .addTag('metrics', '监控 — Prometheus 指标端点')
    .addTag('templates', '模板 — 导入模板下载')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'EpochJudge API 文档',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`EpochJudge API listening on http://localhost:${port}`);
}

bootstrap();
