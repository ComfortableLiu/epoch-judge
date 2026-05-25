# 安全测试基线清单

## 命令注入

| 样例 | 预期 |
|------|------|
| `system("ls")` in C/C++ | 提交前 `SECURITY_ERROR` 或编译/运行失败 |
| `os.system` in Python | 预检拒绝 |
| `child_process` in JS | 预检拒绝 |

## 资源超限

| 样例 | 预期 |
|------|------|
| 死循环 | `TIME_LIMIT_EXCEEDED` |
| 大数组分配 | `MEMORY_LIMIT_EXCEEDED` 或 `RUNTIME_ERROR` |

## 沙箱

- 生产 Linux 容器内启用 `isolate`（`ISOLATE_PATH`）
- 禁止 shell 解释执行用户代码（`execFile` + 固定 argv）
- Judge 容器无对外网络（Compose 网络隔离）

## 回归命令

```bash
yarn workspace @epoch-judge/judge-sandbox build
node --test packages/storage/dist/storage.test.js
```
