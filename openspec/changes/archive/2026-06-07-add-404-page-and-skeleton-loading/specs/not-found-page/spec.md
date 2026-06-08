## ADDED Requirements

### Requirement: 404 页面显示

系统 SHALL 为所有未匹配的路由显示专门的 404 页面，而非重定向到首页。

#### Scenario: 访问不存在的路由

- **WHEN** 用户访问未定义的路由路径（如 `/nonexistent-page`）
- **THEN** 系统显示 404 页面，包含"页面不存在"的友好提示

#### Scenario: 404 页面内容

- **WHEN** 404 页面被显示
- **THEN** 页面 SHALL 包含以下元素：
  - 清晰的 404 错误标识
  - 友好的中文提示"页面不存在"
  - 返回首页的链接或按钮

#### Scenario: 返回首页功能

- **WHEN** 用户点击 404 页面上的"返回首页"链接
- **THEN** 系统导航到首页（`/`）

### Requirement: 路由通配配置

系统 SHALL 配置路由系统以捕获所有未匹配的路径。

#### Scenario: 路由匹配优先级

- **WHEN** 用户访问的路径不匹配任何已定义的路由
- **THEN** 系统 SHALL 将该请求路由到 404 页面组件

#### Scenario: 保持现有路由功能

- **WHEN** 用户访问已定义的路由（如 `/problems`, `/contests`）
- **THEN** 系统 SHALL 正常显示对应页面，不受 404 配置影响
