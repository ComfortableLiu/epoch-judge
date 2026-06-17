## Context

当前仅有开发者文档，缺少面向最终用户的操作手册。新用户上手成本高。

## Goals / Non-Goals

**Goals:**
- 编写学生手册、教师手册、管理员手册
- 包含截图和操作步骤
- 部署到 GitHub Pages

**Non-Goals:**
- 不做视频教程
- 不做多语言版本（先做中文）
- 不做交互式教程

## Decisions

### 1. 文档格式
- **选择**：Markdown + VitePress
- **理由**：Markdown 易维护，VitePress 生成静态站点

### 2. 截图方式
- **选择**：手动截图 + 标注
- **理由**：质量可控，AI 生成截图不准确

## Risks / Trade-offs

- [维护成本] 功能更新时文档需要同步 → 在 PR 检查中要求文档更新

## Migration Plan

1. 创建 docs/user-manual/ 目录
2. 编写三份手册
3. 配置 VitePress
4. 部署到 GitHub Pages
