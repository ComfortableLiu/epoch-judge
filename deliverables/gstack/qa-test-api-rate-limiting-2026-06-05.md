# API Rate Limiting QA 测试报告

**日期**：2026-06-05
**场景**：QA 测试
**参与成员**：质量门神（gstack-qa-lead）
**Spec**：`specs/api-rate-limiting/plan.md`

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟡 有条件通过 — 15/15 静态测试全部通过，但存在 1 个 P1 级功能缺陷（限流装饰器硬编码值，未使用环境变量配置函数）
- 阻塞项数量：1（P1：装饰器硬编码，影响"限流策略可通过环境变量配置"要求的端到端一致性）
- 下一步：修复硬编码问题 → 启动 API 运行功能测试 → 合并

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go — 修复 1 个 P1 后可合并 |
| 测试结果 | 15/15 通过 (配置分析 10 + 代码结构 5) |
| 严重度分布 | 🔴 0 / 🟠 1 (硬编码装饰器) / 🟡 2 / 🟢 3 |
| 关键行动项 | 3 条 |
| 建议负责人 | 工程实现者（修复装饰器）+ QA（运行时验证） |

---

## 1. 质量门神核心结论

### ✅ 质量门神（QA 测试与发布）

- **核心判断**：API 限流实现**基础扎实**，所有 7 项 spec 需求（全局限流 60/min、认证接口 5/min、提交接口 10/min、环境变量配置、HTTP 429、SSE 豁免、ENABLED 开关）均有对应实现。代码结构清晰，`throttle.config.ts` 集中管理配置逻辑，Redis 存储支持分布式部署。总体评分 95/100。
- **关键发现**：auth.controller.ts（第 13、19 行）和 submissions.controller.ts（第 33 行）的 `@Throttle()` 装饰器使用了**硬编码值** `{ ttl: 60000, limit: 5/10 }`，而 `throttle.config.ts` 中定义的 `getAuthThrottleConfig()` 和 `getSubmissionThrottleConfig()` 配置函数**未被使用**。这意味着通过 `THROTTLE_AUTH_LIMIT` 环境变量修改认证限流次数，**不会实际生效**。
- **关键建议**：将控制器中的硬编码 `@Throttle()` 装饰器改为引用配置函数；随后启动 API 运行功能测试脚本 `test-rate-limiting.sh` 验证运行时行为。

---

## 2. 综合审查发现（按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟠 | 功能 | `auth.controller.ts:13,19` | `@Throttle({ default: { ttl: 60000, limit: 5 } })` 硬编码，未使用 `getAuthThrottleConfig()` 配置函数 | 改为 `@Throttle(getAuthThrottleConfig)` 使其支持环境变量动态配置 | 质量门神 |
| 2 | 🟠 | 功能 | `submissions.controller.ts:33` | `@Throttle({ default: { ttl: 60000, limit: 10 } })` 硬编码，未使用 `getSubmissionThrottleConfig()` 配置函数 | 改为 `@Throttle(getSubmissionThrottleConfig)` 使其支持环境变量动态配置 | 质量门神 |
| 3 | 🟡 | 测试 | 项目全局 | 缺少 `throttle.config.ts` 函数的单元测试 | 为 `createThrottleConfig`、`getAuthThrottleConfig`、`getSubmissionThrottleConfig` 添加 Jest 单元测试 | 质量门神 |
| 4 | 🟡 | 文档 | 项目根目录 | 缺少 `.env.example` 文件 | 创建 `.env.example` 并列出所有 `THROTTLE_*` 相关环境变量及默认值 | 质量门神 |
| 5 | 🟢 | 增强 | 运行时 | 无自定义 429 错误响应，使用 NestJS 默认消息 | 考虑实现自定义 ExceptionFilter，返回品牌化错误响应 | 质量门神 |
| 6 | 🟢 | 增强 | 运行时 | 缺少 `X-RateLimit-*` 响应头 | 添加 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset` 响应头 | 质量门神 |
| 7 | 🟢 | 增强 | 监控 | 无限流命中/未命中的监控指标 | 集成 Prometheus 或自定义 metrics 记录限流事件 | 质量门神 |

---

## 3. Spec 需求覆盖矩阵

| # | Spec 需求 | 实现状态 | 测试状态 | 备注 |
|---|----------|---------|---------|------|
| 1 | 全局默认限流 60次/分钟 | ✅ 已实现 | ✅ 静态验证通过 | `ThrottlerModule.forRootAsync` + 全局 `APP_GUARD` |
| 2 | 认证接口限流 5次/分钟 | ✅ 已实现 | ✅ 静态验证通过 | 装饰器已应用，但值硬编码 |
| 3 | 提交接口限流 10次/分钟 | ✅ 已实现 | ✅ 静态验证通过 | 装饰器已应用，但值硬编码 |
| 4 | 环境变量配置 | ⚠️ 部分实现 | ✅ 静态验证通过 | 全局限流配置 OK；接口级装饰器未实际使用配置函数 |
| 5 | HTTP 429 响应 | ✅ 已实现 | ⚠️ 需运行时验证 | `@nestjs/throttler` 自动返回 429 |
| 6 | SSE 端点豁免 | ✅ 已实现 | ✅ 静态验证通过 | `@SkipThrottle()` 在 `/submissions/:number/stream` |
| 7 | THROTTLE_ENABLED 开关 | ✅ 已实现 | ✅ 静态验证通过 | `skipIf: () => !enabled` |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 修复硬编码装饰器：`auth.controller.ts` 的 `@Throttle` 改为引用 `getAuthThrottleConfig`，`submissions.controller.ts` 的 `@Throttle` 改为引用 `getSubmissionThrottleConfig` | 工程实现者 | P1 | 立即 |
| 2 | 启动 API 并运行 `apps/api/src/test-rate-limiting.sh` 验证运行时限流行为（429 触发、SSE 豁免、环境变量生效） | QA | P1 | 修复后 |
| 3 | 为 `throttle.config.ts` 的 3 个配置函数添加 Jest 单元测试 | 工程实现者 | P2 | 本迭代内 |
| 4 | 创建 `.env.example` 文件，列出所有 `THROTTLE_*` 环境变量及默认值 | 工程实现者 | P3 | 本迭代内 |

---

## 4. 测试产物索引

| 文件 | 路径 | 说明 |
|------|------|------|
| 功能测试脚本 | `apps/api/src/test-rate-limiting.sh` | 需 API 运行；8 个测试套件覆盖全部功能需求 |
| 配置测试脚本 | `apps/api/src/test-rate-limiting-env.sh` | 无需 API；10 个静态配置验证用例 |
| 详细测试报告 | `apps/api/src/rate-limiting-test-report.md` | QA 原始产出，含完整评分与代码质量评估 |
| 测试用例文档 | `apps/api/src/rate-limiting-test-cases.md` | 8 个测试套件，20+ 测试用例，含 CI/CD 集成示例 |

---

## ⚠️ 待完善 / 已知局限

- 本次测试以**静态代码分析**为主（15/15 静态验证），运行时功能测试需启动 API 后执行 `test-rate-limiting.sh` 补充验证
- Redis 存储的分布式限流行为（多实例共享）未在本次测试范围内
- 限流窗口重置、并发请求边界等时序相关测试需运行时环境

---

## 📚 成员产出索引

- gstack-qa-lead（质量门神）原始产出：`apps/api/src/rate-limiting-test-report.md`、`apps/api/src/rate-limiting-test-cases.md`、`apps/api/src/test-rate-limiting.sh`、`apps/api/src/test-rate-limiting-env.sh`

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
