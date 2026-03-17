# CDP Bridge

- [中文](#中文)
- [English](#english)

---

## 中文

### 项目简介

`CDP Bridge` 是一个 Windows 本地浏览器桥接工具，用来把你电脑上的 Chrome 系浏览器，通过 Tailscale 和受控 CDP Bridge 安全提供给远程 Agent 使用。

简单说，它能把你这台 Windows 电脑上的浏览器安全地“借给”远程 AI 使用，让 OpenClaw、OpenCode、Codex 这类 Agent 像坐在你电脑前一样打开网页、读取页面并执行操作。

维护者：`bsbofmusic`

### 当前版本

- 版本：`0.2.0`
- 最近更新：`2026-03-17`
- 本版重点：
  - 高级模式改为“高兼容受管副本”
  - 高级副本默认持久化复用，不再自动覆盖
  - 新增“重置高级模式副本”入口
  - 主路径收敛为“先选模式，再点一键启动”
  - 清洁重装继续保留并修正

### 这是什么

它不是直接把 Chrome 的 `9222` 暴露到公网或局域网。

它做的是：

- 浏览器继续留在你的 Windows 本机
- Tailscale 提供私有网络可达性
- CDP Bridge 暴露带 token 的受控连接地址
- Windows 托盘程序负责本地浏览器拉起、状态展示、Prompt 生成和安装维护

### 主要特性

- 支持 Chrome / Edge / Chromium 探测与拉起
- 支持 Tailscale 状态检测与 bridge 地址生成
- 支持 `Clean Mode` 与 `Advanced Mode`
- 支持通用 Agent Prompt、Playwright 代码、开发者 CDP 地址复制
- 支持清洁重装与卸载入口
- 支持高级模式副本持久化和手动重置

### 模式说明

#### 浏览器模式

- `干净模式`
  - 使用独立干净 profile
  - 稳定优先
  - 不继承原生浏览器登录态和扩展

- `高级模式`
  - 为所选 Chrome 用户创建一个高兼容受管副本
  - 尽量保留 Cookie、登录态、扩展本体和扩展设置
  - 使用非默认 `user-data-dir`，保证 Chrome 在新版本安全策略下仍可开启 CDP

#### 页面模式

- `电脑模式`：`1920x1080`
- `手机模式`：`1080x1920`

### 推荐使用流程

#### 首次使用

1. 在本机安装并登录 Tailscale。
2. 启动 `CDP Bridge`。
3. 先选择浏览器模式：
   - 不需要登录态时选 `干净模式`
   - 需要尽量继承插件和登录态时选 `高级模式`
4. 如果是高级模式，再选择要复制的 Chrome 用户。
5. 点击 `一键启动`。
6. 把 `通用 Agent Prompt` 发给远程 Agent。

#### 高级模式的真实行为

高级模式不是直接接管原生 Chrome 默认用户目录，而是：

1. 关闭所选 Chrome 用户当前窗口
2. 复制高价值浏览器数据到一个受管副本
3. 用这个副本拉起支持 CDP 的浏览器

这样做的原因是：新版 Chrome 不允许对默认真实用户目录稳定开启 remote debugging。

#### 高级模式登录建议

高级模式副本是**长期持久化**的。

推荐这样理解：

- 第一次进入高级模式时，它像一个“新安装但预载了你大量数据”的浏览器副本
- 你在里面完成一次登录、二次验证、扩展授权后
- 之后不要随便重置这个副本
- 以后再次进入高级模式，会继续复用这个已经养熟的副本

如果 Gmail 或部分高风控站点第一次仍要求验证身份，这是正常现象。通常在副本里验证一次后，后续复用会更稳定。

### 一键启动与模式切换

当前交互逻辑是：

- 选择模式、选择 Chrome 用户、选择页面模式：**只保存配置**
- 点击 `一键启动`：**真正按当前模式启动浏览器和 bridge**

也就是说：

- 切换模式本身不会自动重启浏览器
- 只有点击 `一键启动` 才会真正执行当前模式

### 开发者区

开发者区目前提供：

- `复制 Playwright 代码`
- `复制开发者 CDP 地址`
- `重置高级模式副本`

其中：

- `重置高级模式副本` 的作用是删除当前高级模式副本
- 删除后，下次你再选择高级模式并点击 `一键启动`，程序会重新创建一个新的副本

只有在你想彻底重来时，才建议点这个按钮。

### Agent 接入

主推荐方式是：

- 使用界面的 `复制通用 Agent Prompt`

它会自动把当前 bridge 地址、模式背景、连接规则和约束一起整理好，交给 Agent 使用。

开发者如果需要低层方式，也可以使用：

- Playwright `connectOverCDP`
- 原始开发者 CDP 地址

### 清洁重装

如果出现以下情况，建议使用安装器里的 `Clean reinstall`：

- 旧安装版残留
- 托盘进程劫持新版本
- 本地状态损坏
- 安装后看起来还是旧逻辑

它会尝试：

- 停止旧进程
- 调用卸载器清理旧版本
- 删除本地运行数据和更新器残留
- 删除快捷方式和旧安装目录

### 构建与开发

安装依赖：

```bash
npm install
```

本地运行：

```bash
npm start
```

只跑 bridge：

```bash
npm run start:bridge
```

语法检查：

```bash
npm run check
```

构建 Windows 安装包：

```bash
npm run dist:win
```

输出文件：

- `dist/CDP Bridge-Setup-0.2.0.exe`

### 项目结构

- `electron/`：桌面壳、托盘、主窗口、渲染层
- `src/`：bridge 核心、浏览器管理、配置、状态机
- `build/`：NSIS 安装器定制
- `scripts/`：本地辅助脚本
- `docs/`：产品与验证文档

### 许可证

MIT

---

## English

### Overview

`CDP Bridge` is a Windows local browser bridge that safely exposes a Chrome-family browser to remote agents through Tailscale and a controlled CDP bridge.

In plain English, it safely “lends” the browser on your Windows PC to a remote AI, so agents like OpenClaw, OpenCode, and Codex can open pages, read content, and perform browser actions as if they were sitting in front of your computer.

Maintained by `bsbofmusic`.

### Current Release

- Version: `0.2.0`
- Last updated: `2026-03-17`
- This release focuses on:
  - rebuilding Advanced Mode as a high-compat managed replica
  - keeping the Advanced replica persistent by default
  - adding a manual “Reset Advanced Replica” action
  - simplifying the main flow to “choose mode, then click Start CDP”
  - retaining the clean reinstall workflow

### What It Does

This project does **not** directly expose Chrome port `9222` to the public internet or a LAN.

Instead, it provides a safer local bridge layer:

- the browser remains on your Windows machine
- Tailscale provides private network reachability
- CDP Bridge exposes a tokenized endpoint
- the desktop app handles local startup, diagnostics, prompts, and packaging

### Key Features

- detects and launches Chrome / Edge / Chromium
- generates Tailscale-aware bridge endpoints
- supports `Clean Mode` and `Advanced Mode`
- provides a generic agent prompt, Playwright snippet, and raw developer CDP URL
- includes clean reinstall and uninstall tools
- keeps the Advanced replica persistent and resettable

### Modes

#### Browser Mode

- `Clean Mode`
  - uses an isolated browser profile
  - best for stability
  - does not reuse your existing logins or extensions

- `Advanced Mode`
  - builds a high-compat managed replica of the selected Chrome user
  - tries to retain cookies, login state, extension binaries, and extension settings
  - uses a non-default `user-data-dir` so CDP remains available under modern Chrome security rules

#### Page Mode

- `Desktop Mode`: `1920x1080`
- `Mobile Mode`: `1080x1920`

### Recommended Workflow

#### First Run

1. Install and sign in to Tailscale on the local Windows machine.
2. Launch `CDP Bridge`.
3. Choose the browser mode:
   - use `Clean Mode` when you do not need an existing login state
   - use `Advanced Mode` when you want the best possible chance of keeping logins and extensions
4. If you use Advanced Mode, choose the Chrome user to replicate.
5. Click `Start CDP`.
6. Send the generated `Generic Agent Prompt` to the remote agent.

#### How Advanced Mode Actually Works

Advanced Mode does **not** directly attach to the default real Chrome user-data directory.

Instead it:

1. closes the selected Chrome user’s current windows
2. copies high-value browser data into a managed replica
3. launches Chrome with that managed replica and CDP enabled

This is necessary because modern Chrome versions no longer allow stable remote debugging against the default real user-data directory.

#### Advanced Mode Login Guidance

The Advanced replica is designed to be **persistent**.

The best mental model is:

- the first time you enter Advanced Mode, it behaves like a “fresh browser clone preloaded with a lot of your data”
- once you complete a login, second-factor check, or extension authorization inside that replica
- keep reusing the same replica
- do not reset it unless you intentionally want to rebuild from scratch

If Gmail or another high-risk site still asks for identity verification the first time, that is expected. In practice, reusing the same warmed-up replica is much more stable than rebuilding it every time.

### Start Flow and Mode Changes

The current interaction model is:

- choosing browser mode, Chrome user, or page mode only **saves configuration**
- clicking `Start CDP` actually starts the browser and bridge for the currently selected mode

That means:

- changing the mode does not immediately restart the browser
- only `Start CDP` executes the selected mode

### Developer Area

The Developer section currently includes:

- `Copy Playwright Snippet`
- `Copy Developer CDP URL`
- `Reset Advanced Replica`

`Reset Advanced Replica` deletes the current Advanced replica.

After that, the next time you choose Advanced Mode and click `Start CDP`, the app will build a new replica from scratch.

Only use that action when you intentionally want to discard the current warmed-up Advanced browser state.

### Agent Handoff

The primary handoff is:

- `Copy Generic Agent Prompt`

It packages the bridge endpoint, mode context, connection rules, and usage constraints into one clean prompt for the remote agent.

Developers can also use:

- Playwright `connectOverCDP`
- the raw developer CDP URL

### Clean Reinstall

Use the installer option named `Clean reinstall` when:

- an older installed build is still interfering
- a stale tray process hijacks the new packaged app
- local runtime state is broken
- the installed app still behaves like an older version

It attempts to:

- stop old processes
- run uninstallers for older installed versions
- remove local runtime data and updater leftovers
- delete shortcuts and stale install directories

### Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm start
```

Run bridge only:

```bash
npm run start:bridge
```

Run syntax checks:

```bash
npm run check
```

Build the Windows installer:

```bash
npm run dist:win
```

Installer output:

- `dist/CDP Bridge-Setup-0.2.0.exe`

### Project Structure

- `electron/`: desktop shell, tray behavior, main window, renderer UI
- `src/`: bridge core, browser management, config, supervisor logic
- `build/`: NSIS installer customization
- `scripts/`: local helper scripts
- `docs/`: product and validation documents

### License

MIT
