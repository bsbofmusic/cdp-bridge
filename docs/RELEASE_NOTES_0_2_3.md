# Release Notes 0.2.3

## 中文

### 更新内容

- Bridge 新增会话级观测能力，可跟踪活跃 Agent 会话与其新建页面
- 新增诊断接口，返回页面 targets、console 输出、JS 异常和轻量网络事件
- 新增按会话关闭页面接口，只清理当前 Agent 会话创建的 targets
- 通用 Agent Prompt 已升级，要求使用 `sessionId` 连接并先检查诊断信息

### 说明

- 远端 Agent 现在可以在连接前知道当前已有多少页面和哪些页面属于当前会话
- 诊断接口是只读观测能力，主要用于排障和状态确认
- 按会话清理页面不会关闭用户已有页面，只处理 bridge 记录为当前会话创建的 targets

---

## English

### What’s New

- The bridge now tracks active agent sessions and the targets they create
- Added a diagnostics endpoint for targets, console output, JS exceptions, and lightweight network events
- Added a close-session-targets endpoint that only closes targets created by the current agent session
- Upgraded the generic agent prompt to require `sessionId` usage and diagnostics checks before control

### Notes

- Agents can now see how many pages already exist before they start working
- The diagnostics endpoint is read-only and intended for observability and troubleshooting
- Session cleanup only affects targets the bridge recorded as created by that session, not user-owned pages
