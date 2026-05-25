# 部署指南

## 一键部署（推荐）

```bash
yarn deploy
```

## 手动步骤

1. `cp .env.example .env` 并按需修改
2. `yarn install && yarn build`
3. `docker compose up -d --build`
4. `yarn db:migrate && yarn db:seed`

## 单机判题（默认）

`docker-compose.yml` 中 `judge` 服务 `replicas: 1`，与 API 共享 `./data/testcases` 卷。

## 扩展多 Worker

```bash
docker compose up -d --scale judge=3
```

## S3 测试数据

```env
STORAGE_TYPE=s3
S3_ENDPOINT=https://...
S3_BUCKET=epoch-judge
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

重启 `api` 与 `judge` 服务后，新上传的测试数据写入对象存储。
