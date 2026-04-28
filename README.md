# CDP Bridge
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2B-blue.svg)](#)
[![Electron](https://img.shields.io/badge/Electron-35.x-47848f.svg)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/Version-0.2.10-green.svg)](./docs/RELEASE_NOTES_0_2_10.md)
[![cdper MCP](https://img.shields.io/npm/v/@bsbofmusic/cdper-mcp?label=cdper%20MCP&color=CB3837)](https://www.npmjs.com/package/@bsbofmusic/cdper-mcp)
[![OpenClaw Compatible](https://img.shields.io/badge/Compatible-OpenClaw-181717.svg)](https://openclaw.ai)

> 🚀 零配置通过Tailscale私有网络远程操控Windows Chrome，搭配cdper工具链实现开箱即用网页自动化，不用改防火墙、不用写爬虫代码。
> ⚠️ 仓库已正式更名为 **cdp-bridge**，原cdp-over-tailscale已归档，功能完全一致。

---

## 🤖 Agent 看到这个仓库后先读这里

如果用户把这个仓库 URL 发给 Agent，并说“帮我部署远程浏览器 / cdper MCP / Hermes skill”，Agent 不需要翻完整仓库，按下面顺序做即可。

### 1. 下载并安装 remote-cdp skill

Skill 已放在仓库顶层，适合直接下载导入：

- 仓库路径：[`skills/remote-cdp/SKILL.md`](./skills/remote-cdp/SKILL.md)
- Raw 下载：`https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md`

Hermes Agent 安装命令：

```bash
mkdir -p ~/.hermes/skills/mcp/remote-cdp
curl -fsSL \
  https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md \
  -o ~/.hermes/skills/mcp/remote-cdp/SKILL.md
hermes skills list | grep remote-cdp
```

### 2. 配置 cdper MCP

在 Hermes / OpenCode / OpenClaw / Claude Desktop / Cursor 的 MCP 配置里注册：

```yaml
mcp_servers:
  cdper:
    command: npx
    args:
      - -y
      - '@bsbofmusic/cdper-mcp@latest'
    type: stdio
    enabled: true
    connect_timeout: 60
    timeout: 600
```

然后 reload MCP 客户端。Hermes 用 `/reload-mcp`；其他客户端重启或重新加载 MCP server。

可选官方包通过 MCP 工具安装，不再推荐旧的 `node index.js install ...` 子命令：

```text
cdper_install({ id: "chatgpt" })
cdper_install({ id: "doubao" })
cdper_install({ id: "reddit" })
```

### 3. 接入 cdp-bridge

cdper 安装好后，如果还没有 CDP 配置，Agent 必须向用户索要 cdp-bridge 生成的连接信息，不要猜 token、不扫公网：

```text
请复制 CDP Bridge 里的完整 WS URL，或提供 Tailscale IP、bridge port 和 WS token。
格式：ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>
```

Agent 只需要向用户确认缺失的三项：

- `<TAILSCALE_IP>`：运行 cdp-bridge 的 Windows 机器 Tailscale IP / MagicDNS
- `<BRIDGE_PORT>`：bridge 端口
- `<TOKEN>`：bridge token

推荐把 token 放进本机私有配置文件，不要写进 README、日志或记忆：

```bash
mkdir -p ~/.cdp-bridge
chmod 700 ~/.cdp-bridge
cat > ~/.cdp-bridge/config.json <<'JSON'
{
  "bridgePort": <BRIDGE_PORT>,
  "token": "<TOKEN>"
}
JSON
chmod 600 ~/.cdp-bridge/config.json
```

如果 bridge 不在本机，给 MCP server 设置：

```bash
CDP_BRIDGE_HOST=<TAILSCALE_IP>
CDP_BRIDGE_CONFIG_PATH=$HOME/.cdp-bridge/config.json
```

也可以直接写完整 WS URL：

```bash
cat > ~/.cdp-auth.json <<'JSON'
{"ws_url":"ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>"}
JSON
chmod 600 ~/.cdp-auth.json
```

### 4. 验证部署

```bash
npx -y @bsbofmusic/cdper@latest doctor
npm view @bsbofmusic/cdper-mcp version
```

Hermes 原生 MCP 验证：

```bash
hermes mcp list
hermes mcp test cdper
```

### 5. 推荐同步注册 Playwright / Puppeteer 系 MCP

cdper 是基础强交互控制入口；如果 Agent 还需要更完整的浏览器开发者工具，推荐同步准备两个可选 MCP：

```yaml
mcp_servers:
  playwright:
    command: npx
    args:
      - -y
      - '@playwright/mcp@latest'
      - --cdp-endpoint
      - 'ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>'
    type: stdio

  chrome-devtools:
    command: npx
    args:
      - -y
      - 'chrome-devtools-mcp@latest'
      - '--wsEndpoint=ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>'
    type: stdio
```

- Playwright 路线：`@playwright/mcp`，适合高级页面操作、截图、网络/控制台调试。
- Puppeteer 路线：`chrome-devtools-mcp`，是 Chrome DevTools/Puppeteer-CDP 方向的现成 MCP；当前没有官方 `@puppeteer/mcp`。
- 这两个 MCP 都连接同一个 cdp-bridge WS endpoint；不要让它们各自启动新的本地浏览器。

### 6. [SUPERMEMORY] 记忆规则

如果 Agent 有 Supermemory，只能保存非敏感稳定事实：skill 路径、包版本、bridge 端口、browser mode、profile 名称。不要保存 CDP token、SSH 密码、API key、带 `token=` 的 WebSocket URL、cookie 或 session dump。

---

## 📚 快速导航
- [中文文档](#chinese-docs)
- [English Documentation](#english-docs)
- [官方配套工具](#official-tools)
- [Agent Skill / Hermes / SUPERMEMORY](#agent-skill--hermes--supermemory)
- [常见问题](#faq)

---

## 中文文档 {#chinese-docs}

### 🎯 解决什么痛点
> “我想让远端Agent直接用我Windows电脑上的浏览器，不想暴露9222端口、不想改一堆防火墙配置”  
> “需要干净的临时浏览器环境，也需要能长期复用的带登录态的浏览器副本”  
> “不想写Puppeteer/Playwright的重复对接代码，要能直接用Agent自动化爬网页”

本项目把本地浏览器包装成**安全可控、可远程拉起、仅Tailscale私网访问**的CDP桥接服务，让远端Agent像坐在你电脑前一样操控浏览器，适合AI自动化、网页抓取、跨网调试等场景。

### ✨ 核心特性
| 特性 | 说明 |
|------|------|
| 🖥️ Windows托盘常驻 | 后台运行不占资源，随时拉起浏览器 |
| 🔒 Tailscale私网暴露 | 不暴露公网、不暴露原始9222端口，token鉴权访问 |
| 🧹 干净模式 | 独立隔离profile，启动快无残留，适合临时自动化任务 |
| 🧠 高级模式 | 持久化可复用浏览器副本，登录一次长期用，养号专用 |
| 🔍 自动感知副本 | 自动识别本地已有的高级模式副本位置，无需手动配置，自动复用 |
| 🎮 远程控制 | 支持远端Agent通过API拉起/重置浏览器 |
| 🔗 多端接入 | 支持通用Agent Prompt、Playwright代码、开发者CDP地址一键复制 |
| 🔄 副本重置 | 一键重置高级模式副本，干净无残留 |
| 🟢 绿色版即用 | 下载后点开直接运行，无需安装，无残留 |

### 🎮 模式说明
#### 🧹 干净模式
- 独立隔离profile，无登录态无扩展
- 启动速度快，稳定优先
- 适合临时自动化、调试、无状态任务

#### 🧠 高级模式
- 独立持久化浏览器副本，可长期复用
- 支持自行登录账号，同步书签/扩展/历史
- 适合养号、长期自动化任务，减少验证码/风控概率

### 🔧 工作原理
```mermaid
flowchart LR
    A[Remote Agent/Tool] -->|Tailscale Private Network| B(CDP Bridge - Windows Tray)
    B --> C[Local Chrome/Edge/Chromium]
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#16a34a,stroke:#15803d,stroke-width:2px,color:#fff
    style C fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```
支持的API接口：
- `/control/start?mode=clean`：远程拉起干净模式浏览器
- `/control/start?mode=advanced&profile=Default`：远程拉起高级模式浏览器
- `/control/ensure-site-tab?url=...&host=...`：优先复用已有站点页，不存在再预热创建
- `/status`：公开、脱敏的 bridge 在线状态和 cdpReady/recommendedAction
- `/json/version?token=xxx`：鉴权检查 CDP readiness，并获取 WebSocket endpoint
- `/devtools/browser?token=xxx`：CDP WebSocket连接地址

### 🚀 快速开始
#### 1. 本地部署（30秒搞定）
✅ 前置要求：
- Windows 10及以上
- 已安装并登录[Tailscale](https://tailscale.com)
- 本地已安装Chrome/Edge/任意Chromium内核浏览器

步骤：
1. 从[Releases](../../releases)下载最新绿色版`CDP Bridge-Portable-x.x.x.exe`
2. 直接双击运行，软件常驻系统托盘，无需安装
3. 界面选择浏览器模式、页面模式、高级模式的Chrome用户
4. 点击「一键启动」，或让远端Agent通过API远程拉起

> 💡 高级模式副本默认保存在Chrome用户目录附近的`CDP Bridge Profiles/`，自动识别复用，无需手动配置。
> 💡 0.2.9 新增 `ensure-site-tab` 预热能力，适合 ChatGPT / 豆包 这类高风控网页先复用已有可信页，再交给 Agent 自动化。

#### 2. 远端Agent对接
先检查bridge连通性：
```bash
curl -s "http://<tailscale-ip>:<bridge-port>/json/version?token=<token>" --connect-timeout 5
```
远程拉起浏览器：
```bash
# 干净模式
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=clean"
# 高级模式（持久副本）
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/start?token=<token>&mode=advanced&profile=Default"

# 预热 / 复用站点标签页
curl -X POST "http://<tailscale-ip>:<bridge-port>/control/ensure-site-tab?token=<token>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```
成功后直接连接返回的WS地址即可操控浏览器。

### 📌 高级模式最佳实践
高级模式是**长期持久化**的，推荐：
1. 第一次进入时手动完成账号登录、二次验证、必要授权
2. 后续持续复用同一个副本，不要频繁重置
3. 高风控站点首次登录需要验证属于正常现象，后续复用就不会再触发

### 👨‍💻 开发者功能
托盘应用提供一键复制功能：
- **复制通用Agent Prompt**：已包含bridge地址、启动逻辑、模式选择、WS连接规则，直接粘贴给Agent即可用
- **复制Playwright代码片段**：可直接运行的Playwright对接代码
- **复制开发者CDP地址**：原始WS地址，用于手动调试
- **查看升级日志**：一键打开当前版本对应的 GitHub Release 页面
- **重置高级模式副本**：删除当前副本，下次启动自动创建新副本

### 🧹 绿色版重置
如果应用行为异常，直接删除同目录下的`data/`文件夹即可恢复初始状态，无需卸载重装。

---

## English {#english-docs}
### What it does
AI agents need a real browser to bypass anti-scraping and access authenticated content. `cdp-bridge` is a Windows tray app that wraps your local Chrome in a token-authenticated CDP bridge, exposed **only over your private Tailscale network**. No port forwarding, no public exposure, zero firewall changes, no installation required.

### How it works
```mermaid
flowchart LR
    A[Remote Agent/Tool] -->|Tailscale Private Network| B(CDP Bridge - Windows Tray)
    B --> C[Local Chrome/Edge/Chromium]
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#16a34a,stroke:#15803d,stroke-width:2px,color:#fff
    style C fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```

### Requirements
- Windows 10+
- [Tailscale](https://tailscale.com) installed and connected to your network
- Chrome/Edge/Chromium-based browser installed locally

### Quick Start
1. Download the latest portable release from [Releases](../../releases)
2. Double click to run (no installation required), it lives in the system tray
3. Configure your bridge port and token in settings
4. Click **Start CDP**, or let your agent call `/control/start` to launch the browser remotely

#### Check bridge status
```bash
curl -s "http://<tailscale-ip>:<port>/json/version?token=<token>" --connect-timeout 5
```

#### Launch browser remotely
```bash
# Clean isolated session (no login state, no extensions)
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=clean"

# Persistent replica (reuse login state, extensions, history)
curl -X POST "http://<tailscale-ip>:<port>/control/start?token=<token>&mode=advanced&profile=Default"

# Prewarm or reuse a trusted site tab
curl -X POST "http://<tailscale-ip>:<port>/control/ensure-site-tab?token=<token>&url=https%3A%2F%2Fchatgpt.com%2F&host=chatgpt.com"
```

### Modes
| Mode | Use Case |
|------|----------|
| 🧹 Clean Mode | Fresh isolated profile every time, best for short-lived stateless tasks |
| 🧠 Advanced Mode | Persistent replica you sign into once and reuse indefinitely, best for building a long-lived "agent browser" |

### Agent Integration
One-click integration helpers are available in the tray menu:
- **Copy Generic Agent Prompt**: Complete prompt with bridge address, startup logic, mode selection, and WS connection rules
- **Copy Playwright Snippet**: Ready-to-run Playwright code targeting the bridge
- **Copy Developer CDP URL**: Raw WebSocket endpoint for manual use/debugging
- **Open Release Notes**: Open the GitHub release page for the current version
- **Reset Advanced Replica**: Delete current persistent replica, create fresh one on next launch

### Zero to first query (cdper-mcp)

1. Register `@bsbofmusic/cdper-mcp@latest` through `npx` in your MCP client.
2. Ask the user for the CDP Bridge generated WS URL or the Tailscale IP + bridge port + token.
3. Store it in `~/.cdp-auth.json` or `~/.cdp-bridge/config.json` locally, then run `npx -y @bsbofmusic/cdper@latest doctor` or call the `cdper_doctor` MCP tool.
4. Install optional official packages from MCP tools when needed: `cdper_install({ id: "chatgpt" })`, `cdper_install({ id: "doubao" })`, `cdper_install({ id: "reddit" })`.

Then register as MCP server and call `chatgpt_query` or `doubao_query`. See [cdper-mcp docs](https://www.npmjs.com/package/@bsbofmusic/cdper-mcp).

---

## 🛠️ 官方配套工具 {#official-tools}
### 1. cdper MCP（强交互真实浏览器控制工具）
不用写 Puppeteer/Playwright 对接代码，cdper 是官方配套的 MCP 工具，直接对接 CDP Bridge 实现打开页面、snapshot、点击、输入、按键、等待、截图、执行 JS 和 tab 管理。

推荐 MCP 配置：

```json
{
  "mcpServers": {
    "cdper": {
      "command": "npx",
      "args": ["-y", "@bsbofmusic/cdper-mcp@latest"]
    }
  }
}
```

安装后如果没有 CDP 配置，Agent 应向用户索要 CDP Bridge 生成的完整 WS URL，或 Tailscale IP + bridge port + token，然后写入本机私有配置。注意很多 MCP 客户端不会继承当前 shell 的 `export`，长期配置应写进 MCP server 的 `env` 或 `~/.cdp-auth.json`。

```bash
mkdir -p ~/.cdp-bridge
cat > ~/.cdp-bridge/config.json <<'JSON'
{"bridgePort": <BRIDGE_PORT>, "token": "<TOKEN>"}
JSON
export CDP_BRIDGE_HOST=<TAILSCALE_IP>
```

最省心的私有配置是完整 WS URL：

```bash
cat > ~/.cdp-auth.json <<'JSON'
{"ws_url":"ws://<TAILSCALE_IP>:<BRIDGE_PORT>/devtools/browser?token=<TOKEN>"}
JSON
chmod 600 ~/.cdp-auth.json
```

✅ 强交互控制 | ✅ 登录态复用 | ✅ 截图取证 | ✅ 可被 Playwright/Puppeteer-CDP 工具共用
👉 [cdper MCP文档](https://www.npmjs.com/package/@bsbofmusic/cdper-mcp)

#### 远端浏览器工具分工

远端 Windows Chrome/Edge 是唯一真实登录态浏览器。cdper、Playwright over CDP 必须连接这条 CDP Bridge 链路；Dokobot 只有在配置为读取同一远端 Chrome/CDP Bridge 时才可视为登录态阅读层；Lightpanda 和 bb browser/Browserbase 不继承远端登录态。

| 任务 | 推荐工具 | 说明 |
|---|---|---|
| 标准登录态交互 | cdper MCP | 默认 Agent 入口：open/snapshot/click/type/wait/eval/screenshot/close |
| 复杂脚本交互、批量 DOM、视觉闭环截图 | Playwright over CDP | 并列连接同一个 CDP Bridge WS；必须 `connectOverCDP`，不要 `launch()` 本地浏览器 |
| 登录态结构化阅读 / markdown | Dokobot | 仅在接入同一远端 Chrome/CDP Bridge 时可信；眼睛，不是手 |
| 公开 URL 快读 | Lightpanda | 独立重新打开 URL，不继承远端 Chrome 登录态 |
| bb browser / Browserbase | 非主链路 | 只适合非登录公开网页，不替代远端 Windows Chrome |

如果任务需要用户浏览器状态，禁止用 Lightpanda、bb browser、Browserbase、curl、web_search 或本地 Playwright launch 冒充成功。cdper 失败时先诊断 bridge/token/port；如果 `/json/version?token=<TOKEN>` 可用，可以用 Playwright over CDP 连接同一个 WS endpoint 继续高级操作。

### 1.1 推荐同步安装的高级操控 MCP / CDP 客户端

如果 Agent 需要更完整的浏览器开发者工具，推荐同步注册或安装：

| 方向 | MCP | 连接方式 |
|---|---|---|
| Playwright | `@playwright/mcp@latest` | `--cdp-endpoint <BRIDGE_WS_URL>` |
| Puppeteer / Chrome DevTools | `chrome-devtools-mcp@latest` | `--wsEndpoint=<BRIDGE_WS_URL>` |

脚本方式必须连接远端 CDP：`chromium.connectOverCDP('<BRIDGE_WS_URL>')`。不要用 `chromium.launch()` 处理登录态任务。

注意：当前没有官方 `@puppeteer/mcp`。Puppeteer 路线推荐用 Google 的 `chrome-devtools-mcp`，或开发者脚本里直接使用 `puppeteer-core` 连接同一个 WS endpoint。

<a id="agent-skill--hermes--supermemory"></a>

### 2. Remote CDP Skill（Agent 直接导入可用）
针对 Hermes / OpenClaw / OpenCode / Claude / Cursor 等支持 Skill 的 Agent，官方提供了去敏的 `remote-cdp` Skill。现在放在仓库顶层 `skills/`，不用再去 `docs/` 里翻：

- ✅ Canonical Skill：[`skills/remote-cdp/SKILL.md`](./skills/remote-cdp/SKILL.md)
- 📚 Skill 索引：[`skills/README.md`](./skills/README.md)
- 🧾 旧链接兼容：[`docs/skills/remote-cdp.md`](./docs/skills/remote-cdp.md)

Hermes 一键安装到本地 skill 树：

```bash
mkdir -p ~/.hermes/skills/mcp/remote-cdp
curl -fsSL \
  https://raw.githubusercontent.com/bsbofmusic/cdp-bridge/main/skills/remote-cdp/SKILL.md \
  -o ~/.hermes/skills/mcp/remote-cdp/SKILL.md
hermes skills list | grep remote-cdp
```

### 3. Hermes + SUPERMEMORY 记忆边界

如果 Hermes / OpenCode / OpenClaw 已启用 **Supermemory**，建议只保存“长期稳定且非敏感”的部署事实，避免每次重新发现环境：

可以保存：
- `cdp-bridge` 是宿主机浏览器 appliance
- `cdper-mcp` 是远端 MCP 控制器
- canonical skill 路径：`skills/remote-cdp/SKILL.md`
- Hermes skill 安装路径：`~/.hermes/skills/mcp/remote-cdp/SKILL.md`
- bridge 端口、浏览器模式、profile 名称
- npm 包安装入口，例如 `@bsbofmusic/cdper-mcp@latest`

不要保存：
- CDP token
- SSH 密码
- API key
- 带 `token=` 的 WebSocket URL
- Cookie / session dump

Supermemory 里召回到的 host/port/profile 只能作为线索；实际使用前先通过公开脱敏的 `/status` 判断 bridge readiness，再通过 `/json/version?token=<TOKEN>` 鉴权验证 CDP readiness 和 WS endpoint。

---

## ❓ 常见问题 {#faq}
| 问题 | 解决方案 |
|------|----------|
| 远端连不上bridge | 1. 确认两台设备在同一个Tailscale网络<br>2. 确认 cdp-bridge 托盘应用正在运行且已点击「一键启动」<br>3. 确认 token 拼写正确（从托盘复制）<br>4. 如使用非 Tailscale 网络，检查防火墙端口 |
| 浏览器启动失败 | 1. 确认本地Chrome/Edge安装到默认路径<br>2. 高级模式下检查profile是否有权限访问<br>3. 删除同目录`data/`文件夹重置 |
| 触发网站反爬 | 1. 用高级模式长期复用同一个受管副本<br>2. 降低高频重复操作，必要时人工接管关键验证步骤 |
| 高级模式登录后仍要验证 | 首次登录高风控站点验证属于正常现象，后续复用同一个副本就不会触发 |

---

## 📝 本地开发
```bash
npm install       # 安装依赖
npm start         # 本地运行
npm run check     # 语法检查
npm run dist:win  # 打包Windows绿色版 → dist/CDP Bridge-Portable-x.x.x.exe
```

---

## License
MIT
