## Why

Judge Worker 中的 `problemTestcasesCache` 是一个无限增长的 Map，用于缓存题目的测试用例数据。随着题库数量增长，该缓存会持续占用内存，长期运行可能导致 OOM（内存溢出）。需要实现 LRU（最近最少使用）淘汰策略，设置最大缓存条目数，超过时自动淘汰最久未访问的条目，防止内存无限增长。

## What Changes

- 将 `problemTestcasesCache` 从普通 Map 改为 LRU 缓存结构
- 设置最大缓存条目数（如 1000）
- 实现 LRU 淘汰策略：当缓存满时，淘汰最久未访问的条目
- 保持现有缓存命中逻辑不变
- 可选：引入 `lru-cache` 库或使用 Map 插入顺序特性实现

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `judge-engine`: 添加内存管理要求，Judge Worker 缓存必须实现 LRU 淘汰策略，防止内存无限增长

## Impact

- 影响代码：Judge Worker 中的缓存实现（可能位于 `src/judge/` 或 `src/worker/` 目录）
- 影响性能：LRU 淘汰可能导致少量缓存未命中，但防止了 OOM 风险
- 影响内存：内存使用将被限制在可控范围内
- 依赖：可选引入 `lru-cache` 库
