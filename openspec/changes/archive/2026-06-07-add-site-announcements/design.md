## Context

EpochJudge 是一个开源 OJ 平台，当前没有任何站内公告机制。管理员需要通过外部渠道（QQ 群、邮件）向用户传达比赛通知、系统维护公告等信息，效率低且容易遗漏。

现有技术栈：
- 后端：NestJS + TypeORM + MySQL + Redis
- 前端：React + Ant Design + Rspack
- 认证：JWT + Guards

## Goals / Non-Goals

**Goals:**
- 提供公告 CRUD 管理功能（管理员）
- 支持公告置顶、起止时间控制展示周期
- 用户首页顶部 Banner 展示活跃公告
- Banner 支持关闭/展开交互

**Non-Goals:**
- 不实现公告推送通知（如邮件、WebSocket 推送）
- 不实现公告已读/未读状态追踪
- 不实现公告分类/标签系统
- 不实现公告富文本编辑器（使用纯文本/Markdown）

## Decisions

### 1. 数据模型设计

**Decision**: 使用单一 `announcements` 表，包含标题、内容、置顶状态、起止时间、创建者等字段。

**Rationale**: 公告系统需求简单，单一表即可满足，无需关联表。置顶状态使用布尔字段而非优先级数值，简化逻辑。

**Alternatives considered**:
- 使用优先级数值字段：过度设计，当前只需置顶/非置顶两级
- 分离为 announcements + announcement_settings 表：增加复杂度，无明显收益

**Schema**:
```typescript
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @ManyToOne(() => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. API 设计

**Decision**: 分离管理端和用户端 API，使用不同的路由前缀和权限控制。

**Rationale**: 管理端需要完整 CRUD，用户端只需查询有效公告。分离路由便于权限管理和 API 文档组织。

**Routes**:
- 管理端: `/api/admin/announcements` (需要 Admin Guard)
  - `GET /` - 列表（分页、筛选）
  - `POST /` - 创建
  - `PATCH /:id` - 更新
  - `DELETE /:id` - 删除
- 用户端: `/api/announcements`
  - `GET /active` - 获取当前有效公告列表

### 3. 有效公告查询逻辑

**Decision**: 在数据库层面过滤有效公告，条件为：
1. `startsAt IS NULL OR startsAt <= NOW()`
2. `endsAt IS NULL OR endsAt >= NOW()`
3. 按 `isPinned DESC, createdAt DESC` 排序

**Rationale**: 数据库过滤比应用层过滤更高效，减少网络传输。允许 null 值表示无时间限制。

### 4. 前端 Banner 组件设计

**Decision**: 使用 Ant Design 的 `Alert` 组件作为基础，自定义样式实现 Banner 效果。支持：
- 关单条公告（存储到 localStorage）
- 展开/收起全部公告
- 置顶公告优先显示

**Rationale**: Alert 组件已提供关闭按钮、图标、样式等基础能力，减少自定义工作量。localStorage 存储关闭状态，无需后端记录。

**Alternatives considered**:
- 自定义 Banner 组件：更多工作量，但更灵活
- 使用 Ant Design `Notification`：不适合持久展示

### 5. 权限控制

**Decision**: 复用现有 Admin Guard，无需新增权限角色。

**Rationale**: 公告管理属于管理员职能，现有 `@UseGuards(AdminGuard)` 即可满足。

## Risks / Trade-offs

**[Risk] 公告数量过多影响首页性能**
→ Mitigation: 用户端 API 限制返回数量（如最多 10 条），分页查询管理端

**[Risk] localStorage 存储关闭状态可能被清除**
→ Mitigation: 可接受，用户清除浏览器数据后重新看到公告是合理行为

**[Risk] 起止时间为空时的边界情况**
→ Mitigation: 明确文档说明 null 表示无限制，代码中使用 `OR IS NULL` 条件处理

## Migration Plan

1. 创建 announcements 表迁移文件
2. 运行迁移
3. 无需数据迁移（新功能）

## Open Questions

- 无
