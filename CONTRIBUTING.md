# Contributing to EpochJudge

感谢参与 **纪元 / EpochJudge** 开源 OJ 项目。

## 开发环境

- Node.js 18+
- Yarn 4+
- Docker & Docker Compose（推荐）

```bash
yarn install
cp .env.example .env
docker compose up -d mysql redis
yarn db:migrate
yarn dev
```

## 提交规范

- 使用 TypeScript，遵循现有目录与命名
- 禁止引入 Tailwind CSS
- UI 图标使用 `@icon-park/react`

## Pull Request

1. Fork 并创建分支
2. 确保 `yarn build` 通过
3. 描述变更与测试方式
