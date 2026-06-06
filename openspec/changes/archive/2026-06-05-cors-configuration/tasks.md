## 1. CORS 配置实现

- [x] 1.1 在 `apps/api/src/main.ts` 的 `bootstrap()` 中，调用 `app.enableCors()` 配置 CORS：读取 `CORS_ORIGINS` 环境变量（逗号分隔），`NODE_ENV=development` 时默认 `http://localhost:8080`，启用 `credentials: true`，允许 `Authorization`/`Content-Type` 等常用 header，允许常见 HTTP 方法
- [x] 1.2 在 `apps/api/src/main.ts` 中添加 CORS 配置的日志输出，启动时打印允许的 origin 列表便于调试

## 2. 环境变量与文档

- [x] 2.1 更新 `.env.example`，添加 `CORS_ORIGINS` 环境变量，附注释说明格式（逗号分隔 URL）及默认行为
- [x] 2.2 更新部署文档（`docs/developer.md`），说明 CORS 配置方式及生产环境注意事项

## 3. 验证

- [x] 3.1 手动验证：不设置 `CORS_ORIGINS`，`NODE_ENV=development` 时从 `localhost:8080` 发起跨域请求被允许
- [x] 3.2 手动验证：设置 `CORS_ORIGINS=https://example.com`，从其他 origin 发起请求被拒绝
- [x] 3.3 手动验证：预检 OPTIONS 请求返回正确的 `Access-Control-Allow-*` 头
- [x] 3.4 手动验证：跨域请求携带 `Authorization` header 和 credentials 正常工作
