# cdp-over-tailscale

> Run Chrome on your Windows machine. Control it from anywhere — privately, over Tailscale.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2B-blue.svg)](#)
[![Electron](https://img.shields.io/badge/Electron-35.x-47848f.svg)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/Version-0.2.1-green.svg)](./docs/RELEASE_NOTES_0_2_1.md)

---

- [English](#english)
- [中文](#中文)

---

## 中文

### 它解决什么问题

> “我想让远端 Agent 直接使用我这台 Windows 电脑上的浏览器。”  
> “我不想暴露原始 9222，也不想改一堆防火墙和 Chrome 调试参数。”  
> “我想要干净模式，也想要一个可以长期复用的高级副本模式。”

这个项目把本地浏览器包装成一个**可控、可远程拉起、可通过 Tailscale 私有访问**的 CDP Bridge。

简单说，它能把你这台 Windows 电脑上的浏览器安全地“借给”远程 AI 使用，让 OpenClaw、OpenCode、Codex 这类 Agent 像坐在你电脑前一样打开网页、读取页面并执行操作。

维护者：`bsbofmusic`

### 核心特性

- Windows 托盘常驻，随时可拉起本地浏览器
- 通过 Tailscale 暴露私有 bridge 地址，不暴露原始 `9222`
- 支持 `干净模式` 与 `高级模式`
- 支持远端 Agent 自主调用 `/control/start` 拉起浏览器
- 支持通用 Agent Prompt、Playwright 代码片段、开发者 CDP 地址复制
- 支持 `重置高级模式副本`
- 支持清洁重装与安装版恢复

### 模式说明

#### `干净模式`

- 使用隔离的独立 profile
- 启动快，稳定优先
- 不继承原生浏览器登录态和扩展
- 适合自动化、调试、临时任务

#### `高级模式`

- 创建一个**独立且可持久复用**的浏览器副本
- 默认不再重度复制原生浏览器数据
- 更适合在副本里自行登录账号，然后让浏览器自己同步书签、扩展、历史等资料
- 适合长期养熟一个“Agent 专用副本”

### 工作方式

```
Remote Agent
    │
    ├── Tailscale private network
    │
    └── CDP Bridge (Windows tray app)
          │
          ├── /control/start?mode=clean
          ├── /control/start?mode=advanced&profile=Default
          ├── /json/version?token=...
          └── /devtools/browser?token=...
                │
                ▼
             Local Chrome / Edge / Chromium
```

### 快速开始

#### 1. 启动绿色版（推荐）

1. 在本机安装并登录 Tailscale。
2. 下载并放置 `CDP Bridge-Portable-0.2.2.exe`。
3. 启动软件，让它常驻托盘。
4. 程序会在同目录自动创建 `data/` 保存配置和日志。
4. 在界面中选择：
   - 浏览器模式
   - 页面模式
   - 高级模式下的 Chrome 用户
5. 点击 `一键启动`，或让远端 Agent 通过 `/control/start` 远程拉起。

说明：高级模式副本固定保存在 Chrome 用户目录附近的 `CDP Bridge Profiles/`，程序会自动识别并复用已有带标记副本。

#### 2. 远端 Agent 使用

先检查 bridge：

```bash
curl -s "http://<tailscale-ip>:<bridge-port>/json/version?token=<token>" --connect-timeout 5
```

如果本地浏览器还没准备好，可远程拉起：

```bash
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=clean"
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=advanced&profile=Default"
```

成功后再连接 bridge WS 地址。

### 高级模式建议

高级模式副本是**长期持久化**的。

推荐做法：

- 第一次进入高级模式时，把它当成一个新的独立浏览器
- 在里面完成登录、二次验证、必要授权
- 然后持续复用这个副本
- 不要频繁重置，除非你明确想重来

如果第一次登录 Gmail 或高风控站点仍要求验证身份，这是正常现象。关键是后续继续复用同一个副本，而不是反复重建。

### 开发者区

开发者区包含：

- `复制 Playwright 代码`
- `复制开发者 CDP 地址`
- `重置高级模式副本`

其中：

- `重置高级模式副本` 会删除当前高级副本
- 下次选择高级模式并点击 `一键启动` 时，会重新创建新的副本

### 通用 Agent Prompt

主推荐接入方式是点击：

- `复制通用 Agent Prompt`

这段 prompt 已经包含：

- bridge 地址
- 远程启动逻辑
- `clean` / `advanced` 模式选择方式
- WS 连接规则
- 失败时的返回要求

### 清洁重装

如果安装版行为异常、旧版本残留、托盘劫持或本地状态损坏，使用安装器中的：

- `Clean reinstall`

它会尝试清理旧安装、旧进程、旧用户态数据和快捷方式。

### 本地开发

安装依赖：

```bash
npm install
```

运行：

```bash
npm start
```

语法检查：

```bash
npm run check
```

打包 Windows 安装器：

```bash
npm run dist:portable
```

输出文件：

```text
dist/CDP Bridge-Portable-0.2.2.exe
```

---

## English

### What it does

AI agents need a real browser. This tool gives them one.

`cdp-over-tailscale` is a Windows tray app that wraps your local Chrome in a token-authenticated CDP bridge, exposed exclusively over your Tailscale private network. No port forwarding. No public exposure. Your agent calls an API, the browser starts, and a WebSocket endpoint is ready to connect.

Think of it as a Tailscale plugin for browser automation.

### How it works

```
Remote Agent (anywhere on your Tailscale network)
    │
    ├─ POST /control/start   ← start the browser remotely
    ├─ GET  /json/version    ← check bridge status
    └─ WS   /devtools/browser ← connect and control
          │
          ▼
    CDP Bridge (Windows tray app)
          │
          ▼
    Local Chrome / Edge / Chromium
```

### Requirements

- Windows 10 or later
- [Tailscale](https://tailscale.com) installed and signed in
- Chrome, Edge, or any Chromium-based browser

### Quick Start

1. Install Tailscale and connect to your network.
2. Download and install `CDP Bridge` from [Releases](../../releases).
3. Launch it — it lives in the system tray.
4. Set your bridge port and token in the settings.
5. Click **Start CDP**, or let your agent call `/control/start`.

**Check the bridge:**

```bash
curl -s "http://<tailscale-ip>:<port>/json/version?token=<token>" --connect-timeout 5
```

**Start the browser remotely:**

```bash
# Clean isolated session
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=clean"

# Persistent replica with a specific Chrome profile
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=advanced&profile=Default"
```

**Then connect your agent to the WebSocket endpoint.**

### Modes

#### Clean Mode

Starts Chrome with a fresh isolated profile every time. No login state, no extensions carried over. Best for stateless automation and short-lived tasks.

#### Advanced Mode

Creates a persistent browser replica that you sign into once and reuse indefinitely. Bookmarks, extensions, and history sync naturally. Best for building a long-lived "agent browser" that stays warmed up.

> First-time sign-in to high-security sites (e.g. Gmail) may still require verification — that is expected. The key is to keep reusing the same replica rather than resetting it.

### Agent Integration

The tray app provides ready-to-use integration helpers:

- **Copy Generic Agent Prompt** — a complete prompt with bridge address, startup logic, mode selection, and WS connection rules. Paste directly into your agent.
- **Copy Playwright Snippet** — ready-to-run Playwright code targeting the bridge.
- **Copy Developer CDP URL** — raw endpoint for manual use or debugging.

### Developer Area

| Action | Effect |
|--------|--------|
| Copy Playwright Snippet | Playwright code for the current bridge |
| Copy Developer CDP URL | Raw CDP WebSocket URL |
| Reset Advanced Replica | Deletes the current replica; next launch creates a fresh one |

### Local Development

```bash
npm install     # install dependencies
npm start       # run locally
npm run check   # syntax check
npm run dist:win  # build Windows installer → dist/CDP Bridge-Setup-0.2.1.exe
```

### Clean Reinstall

If the app behaves unexpectedly or a previous install left stale state, use the **Clean reinstall** option in the installer. It removes old processes, runtime data, and shortcuts before reinstalling.

---

## 中文

### 它是什么

`cdp-over-tailscale` 是一个 Windows 托盘应用，把你本地的 Chrome 包装成一个通过 Tailscale 私网访问的 CDP Bridge。

可以把它理解成 **Tailscale 的浏览器自动化插件**：远端 Agent 通过 API 拉起浏览器，连接 WebSocket，像坐在你电脑前一样操控页面。全程走 Tailscale 私网，不暴露公网端口，不需要改防火墙。

### 工作方式

```
远端 Agent（Tailscale 网络内任意位置）
    │
    ├─ POST /control/start   ← 远程拉起浏览器
    ├─ GET  /json/version    ← 检查 bridge 状态
    └─ WS   /devtools/browser ← 连接并控制
          │
          ▼
    CDP Bridge（Windows 托盘应用）
          │
          ▼
    本地 Chrome / Edge / Chromium
```

### 环境要求

- Windows 10 及以上
- 已安装并登录 [Tailscale](https://tailscale.com)
- Chrome、Edge 或任意 Chromium 内核浏览器

### 快速开始

1. 安装 Tailscale 并连接到你的网络。
2. 从 [Releases](../../releases) 下载并安装 `CDP Bridge`。
3. 启动后常驻托盘。
4. 在设置中配置 bridge 端口和 token。
5. 点击 **一键启动**，或让远端 Agent 调用 `/control/start`。

**检查 bridge 状态：**

```bash
curl -s "http://<tailscale-ip>:<端口>/json/version?token=<token>" --connect-timeout 5
```

**远程拉起浏览器：**

```bash
# 干净模式（隔离 profile）
curl -X POST "http://<tailscale-ip>:<端口>/control/start?token=<token>&mode=clean"

# 高级模式（持久副本，指定 Chrome 用户）
curl -X POST "http://<tailscale-ip>:<端口>/control/start?token=<token>&mode=advanced&profile=Default"
```

### 模式说明

#### 干净模式

每次使用独立隔离的 profile 启动，不继承登录态和扩展。适合无状态自动化和临时任务。

#### 高级模式

创建一个持久化的浏览器副本，登录一次后长期复用。书签、扩展、历史自然同步。适合养一个专属的"Agent 浏览器"。

> 首次登录高风控站点（如 Gmail）可能仍需验证身份，这是正常现象。关键是持续复用同一个副本，而不是反复重置。

### Agent 接入

托盘应用提供三种接入方式：

- **复制通用 Agent Prompt** — 包含 bridge 地址、远程启动逻辑、模式选择和 WS 连接规则，直接粘贴给 Agent 使用。
- **复制 Playwright 代码** — 可直接运行的 Playwright 代码片段。
- **复制开发者 CDP 地址** — 原始 WebSocket 地址，用于手动调试。

### 本地开发

```bash
npm install       # 安装依赖
npm start         # 本地运行
npm run check     # 语法检查
npm run dist:win  # 打包 Windows 安装器 → dist/CDP Bridge-Setup-0.2.1.exe
```

### 清洁重装

如果安装版行为异常或旧版本残留，使用安装器中的 **Clean reinstall** 选项，它会清理旧进程、旧数据和快捷方式后重新安装。

---

## License

MIT
