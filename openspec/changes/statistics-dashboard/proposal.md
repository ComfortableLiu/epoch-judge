## Why

管理员和运营者无法直观了解平台使用情况（日活用户、提交量、判题延迟、热门题目等），缺乏数据驱动决策的基础。需要一个统计仪表盘。

## What Changes

- 管理后台新增"数据统计"页面
- 核心指标卡片：DAU（日活跃用户）、总提交量、今日提交、平均判题延迟、在线判题节点数
- 趋势图表：最近 30 天提交量趋势、用户增长趋势
- 热门题目 Top10（按提交量排序）
- 语言分布饼图（各语言提交占比）
- 数据通过定时任务聚合，缓存到 Redis

## Capabilities

### New Capabilities

- `statistics-dashboard`: 管理后台数据统计仪表盘

### Modified Capabilities

（无）

## Impact

- **API**：新增 stats 模块（聚合查询 + Redis 缓存）
- **前端**：管理后台新增 Dashboard 页面，使用 Ant Design Charts
- **Redis**：缓存统计结果 `stats:daily:{date}`
- **数据库**：需要对 submissions 表做聚合查询，注意索引优化
