/**
 * Export OpenAPI specification to docs/openapi.json
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/export-openapi.ts
 */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('EpochJudge API')
    .setDescription('纪元 — 开源 Online Judge 平台 API')
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

  const outPath = path.resolve(__dirname, '../../../docs/openapi.json');
  fs.writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n');
  console.log(`OpenAPI spec exported to ${outPath}`);

  await app.close();
}

exportOpenApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
