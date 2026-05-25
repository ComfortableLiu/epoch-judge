# 开发者文档

## API

- 前缀：`/api/v1`
- 文档：运行 API 后访问 `/api/docs`
- 语言头：`X-Locale: zh-CN | en-US`

## 判题流程

1. `POST /submissions` 创建提交并入 BullMQ 队列（队列名 `judge-tasks`，Redis 前缀 `REDIS_KEY_PREFIX`）
2. Judge Worker 消费任务，写回 `submission_testcase_results`
3. 经 Redis pub/sub `{REDIS_KEY_PREFIX}:judge:events` 推送 SSE：`GET /submissions/:id/stream`

开发模式设置 `JUDGE_MOCK=true` 跳过真实沙箱。

## 题目导入 ZIP 结构

```
problem.yaml
statement.md
assets/          # 可选，题面内嵌图片（png/jpg/gif/webp/svg）
  diagram.png
testdata/
  1.in
  1.out
```

`statement.md` 中可用相对路径引用图片，例如 `![](assets/diagram.png)`，导入后会通过 `GET /api/v1/problems/:slug/assets/*` 提供访问。

模板见仓库 `templates/` 目录。

## 用户批量导入 CSV

```csv
username,email,password
```

模板：`GET /api/v1/templates/user-import.csv`
